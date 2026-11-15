import { Edges } from "@react-three/drei";
import { Label } from "./Label";
import type { ThreeEvent } from "@react-three/fiber";
import type { FaceId } from "@vlezet/domain";
export const faceNames: Record<FaceId, string> = {
  "+X": "Перед",
  "-X": "Зад",
  "+Y": "Справа",
  "-Y": "Слева",
  "+Z": "Верх",
  "-Z": "Низ",
};
const sideFaces: FaceId[] = ["+X", "-X", "+Z", "-Z", "-Y", "+Y"];
export function BoxMesh({
  selected,
  onFace,
}: {
  selected: FaceId[];
  onFace: (f: FaceId) => void;
}) {
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.face) onFace(sideFaces[e.face.materialIndex]);
  };
  return (
    <group>
      <mesh onClick={click}>
        <boxGeometry args={[1.4, 1, 1.1]} />
        {sideFaces.map((f, i) => (
          <meshStandardMaterial
            key={f}
            attach={`material-${i}`}
            color={selected.includes(f) ? "#369d81" : "#cdd4cf"}
          />
        ))}
        <Edges color="#244e43" />
      </mesh>
      <Label position={[0, 0.65, 0]} text="+Z верх" />
      <Label position={[0.85, 0, 0]} text="+X перед" />
      <Label position={[0, 0, -0.7]} text="+Y справа" />
    </group>
  );
}
