import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { faces, type FaceId } from "@vlezet/domain";
import { BoxMesh, faceNames } from "../../scene/BoxMesh";
export function FaceSelector({
  value,
  onChange,
}: {
  value: FaceId[];
  onChange: (f: FaceId[]) => void;
}) {
  const toggle = (f: FaceId) => {
    if (value.includes(f)) {
      if (value.length > 1) onChange(value.filter((v) => v !== f));
    } else onChange([...value, f]);
  };
  return (
    <fieldset>
      <legend>На каких гранях можно стоять?</legend>
      <p className="hint">
        Нажмите на грань или кнопку. Зелёные разрешены. Коробку можно вращать
        вокруг вертикали.
      </p>
      <div className="face-preview">
        <Canvas camera={{ position: [2, 2, 3], fov: 35 }} dpr={[1, 1.5]}>
          <ambientLight intensity={1.8} />
          <directionalLight position={[3, 4, 2]} intensity={2} />
          <BoxMesh selected={value} onFace={toggle} />
          <OrbitControls enableZoom={false} />
        </Canvas>
      </div>
      <div className="face-buttons">
        {faces.map((f) => (
          <button
            type="button"
            aria-pressed={value.includes(f)}
            key={f}
            onClick={() => toggle(f)}
          >
            {faceNames[f]} {f}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
