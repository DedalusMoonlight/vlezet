import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Vector3, MathUtils } from "three";

export function Label({
  text,
  detail,
  position,
}: {
  text: string;
  detail?: string;
  position: [number, number, number];
}) {
  const group = useRef<Group>(null);
  const element = useRef<HTMLDivElement | null>(null);
  const projected = useRef(new Vector3());
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    // A plain DOM overlay avoids a second React root inside the 3D renderer.
    const label = document.createElement("div");
    label.className = detail ? "scene-label scene-cargo-label" : "scene-label";
    label.style.position = "absolute";
    label.style.left = "0";
    label.style.top = "0";
    label.style.visibility = "hidden";
    label.style.zIndex = detail ? "2" : "1";
    if (detail) {
      const name = document.createElement("strong");
      name.textContent = text;
      const description = document.createElement("span");
      description.textContent = detail;
      label.append(name, description);
    } else label.textContent = text;
    canvas.parentElement!.append(label);
    element.current = label;
    return () => {
      element.current = null;
      label.remove();
    };
  }, [canvas, text, detail]);
  useFrame(({ camera, size }) => {
    if (!group.current || !element.current) return;
    const label = element.current;
    group.current.updateWorldMatrix(true, false);
    const p = projected.current
      .setFromMatrixPosition(group.current.matrixWorld)
      .project(camera);
    label.style.visibility = p.z < -1 || p.z > 1 ? "hidden" : "visible";
    label.style.maxWidth = `${Math.max(1, size.width - 24)}px`;
    const halfWidth = label.offsetWidth / 2 + 8;
    const halfHeight = label.offsetHeight / 2 + 8;
    const x = MathUtils.clamp(
      ((p.x + 1) * size.width) / 2,
      halfWidth,
      size.width - halfWidth,
    );
    const y = MathUtils.clamp(
      ((1 - p.y) * size.height) / 2 - (detail ? halfHeight + 4 : 0),
      halfHeight,
      size.height - halfHeight,
    );
    label.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  });
  return <group ref={group} position={position} />;
}
