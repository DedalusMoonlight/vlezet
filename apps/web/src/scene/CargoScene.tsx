import {
  Component,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Edges, OrbitControls } from "@react-three/drei";
import { Color, InstancedMesh, Matrix4, Vector3 } from "three";
import type { Placement, ProjectInput } from "@vlezet/domain";
import { orientedDimensions } from "@vlezet/validation";
import { Label } from "./Label";
import { cargoInstanceNumber } from "../features/project/cargoLabel";
import { scenePosition } from "./orientationAdapter";
export const stopColors = [
  "#7eab8c",
  "#dbb97f",
  "#98a9c5",
  "#bd93a5",
  "#9bb8b3",
  "#c1b58a",
];
function Camera({ view, input }: { view: string; input: ProjectInput }) {
  const { camera, controls } = useThree();
  useEffect(() => {
    const l = input.vehicle.lengthMm / 1000,
      w = input.vehicle.widthMm / 1000,
      h = input.vehicle.heightMm / 1000,
      d = Math.max(l, w, h) * 1.6;
    const center = new Vector3(l / 2, h / 3, -w / 2);
    camera.up.set(0, 1, 0);
    camera.position
      .copy(center)
      .add(
        view === "top"
          ? new Vector3(0, d, 0.001)
          : view === "rear"
            ? new Vector3(-d, 0.1, 0)
            : view === "side"
              ? new Vector3(0, 0.1, d)
              : new Vector3(-d, d * 0.8, d * 0.9),
      );
    camera.lookAt(center);
    if (controls && "target" in controls) {
      (controls.target as Vector3).copy(center);
      (controls as unknown as { update: () => void }).update();
    }
  }, [view, input.vehicle, camera, controls]);
  return null;
}
function Boxes({
  input,
  placements,
  selected,
  onSelect,
}: {
  input: ProjectInput;
  placements: Placement[];
  selected: string | null;
  onSelect?: (id: string) => void;
}) {
  const ref = useRef<InstancedMesh>(null);
  const types = useMemo(
    () =>
      new Map(
        input.instances.map((i) => [
          i.id,
          input.cargoTypes.find((t) => t.id === i.typeId)!,
        ]),
      ),
    [input],
  );
  const stops = [...new Set(input.cargoTypes.map((t) => t.stop))].sort(
    (a, b) => a - b,
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    placements.forEach((p, i) => {
      const t = types.get(p.instanceId)!;
      const [x, y, z] = orientedDimensions(t, p.orientation).map(
        (n) => n / 1000,
      );
      mesh.setMatrixAt(
        i,
        new Matrix4()
          .makeScale(x, z, y)
          .setPosition(
            p.position.x / 1000 + x / 2,
            p.position.z / 1000 + z / 2,
            -p.position.y / 1000 - y / 2,
          ),
      );
      mesh.setColorAt(
        i,
        new Color(
          p.instanceId === selected
            ? "#d88d4c"
            : stopColors[stops.indexOf(t.stop) % stopColors.length],
        ),
      );
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [input, placements, selected, types]);
  const active = placements.find((p) => p.instanceId === selected);
  return (
    <>
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, placements.length]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (e.instanceId === undefined) return;
          e.stopPropagation();
          if (e.delta <= 5) onSelect?.(placements[e.instanceId].instanceId);
        }}
      >
        <boxGeometry />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      {active &&
        (() => {
          const c = types.get(active.instanceId)!;
          const [l, w, h] = orientedDimensions(c, active.orientation);
          return (
            <group
              position={scenePosition({
                x: active.position.x + l / 2,
                y: active.position.y + w / 2,
                z: active.position.z + h / 2,
              })}
            >
              <mesh>
                <boxGeometry args={[l / 1000, h / 1000, w / 1000]} />
                <meshBasicMaterial transparent opacity={0} />
                <Edges color="#264c34" />
              </mesh>
              <Label
                text={c.name}
                detail={`№${cargoInstanceNumber(input, active.instanceId)} · остановка ${c.stop}`}
                position={[0, h / 2000 + 0.1, 0]}
              />
            </group>
          );
        })()}
    </>
  );
}
export class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="warning">
        3D недоступен. Перезагрузите страницу; данные и расчёт остаются
        доступны.
      </div>
    ) : (
      this.props.children
    );
  }
}
export function CargoScene({
  input,
  placements,
  selected = null,
  onSelect,
}: {
  input: ProjectInput;
  placements: Placement[];
  selected?: string | null;
  onSelect?: (id: string) => void;
}) {
  const [view, setView] = useState("perspective");
  const [lost, setLost] = useState(false);
  const [generation, setGeneration] = useState(0);
  const l = input.vehicle.lengthMm / 1000,
    w = input.vehicle.widthMm / 1000,
    h = input.vehicle.heightMm / 1000;
  return (
    <>
      <div className="view-buttons">
        {[
          ["perspective", "3D"],
          ["top", "Сверху"],
          ["rear", "Сзади"],
          ["side", "Сбоку"],
        ].map(([v, label]) => (
          <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
            {label}
          </button>
        ))}
      </div>
      <div className="cargo-scene" aria-label="3D схема загрузки">
        <SceneBoundary key={generation}>
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [-4, 4, 4], fov: 40, near: 0.001, far: 1000 }}
            gl={{ antialias: true, preserveDrawingBuffer: true }}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener("webglcontextlost", (e) => {
                e.preventDefault();
                setLost(true);
              });
            }}
          >
            <color attach="background" args={["#eff3e9"]} />
            <ambientLight intensity={1.8} />
            <directionalLight position={[-3, 8, 5]} intensity={2.3} />
            <mesh position={[l / 2, -0.02, -w / 2]}>
              <boxGeometry args={[l + 0.08, 0.04, w + 0.08]} />
              <meshStandardMaterial color="#d1dac9" />
            </mesh>
            <mesh position={[l / 2, h / 2, -w / 2]}>
              <boxGeometry args={[l, h, w]} />
              <meshBasicMaterial transparent opacity={0} />
              <Edges color="#93a48c" />
            </mesh>
            {placements.length > 0 && (
              <Boxes
                input={input}
                placements={placements}
                selected={selected}
                onSelect={onSelect}
              />
            )}
            <Label text="← Задние двери" position={[-0.2, 0, -w / 2]} />
            <OrbitControls
              makeDefault
              target={[l / 2, h / 3, -w / 2]}
              maxDistance={Math.max(l, w, h) * 8}
              minDistance={0.2}
            />
            <Camera view={view} input={input} />
          </Canvas>
        </SceneBoundary>
        {lost && (
          <div className="warning">
            3D приостановлен устройством.{" "}
            <button
              onClick={() => {
                setLost(false);
                setGeneration((v) => v + 1);
              }}
            >
              Восстановить 3D
            </button>
          </div>
        )}
      </div>
      <p className="hint">
        Поверните одним пальцем · масштабируйте двумя · нажмите на коробку
      </p>
    </>
  );
}
