import * as THREE from "three";
import type { ProjectInput, Placement } from "@vlezet/domain";
import { orientedDimensions } from "@vlezet/validation";
export async function renderFrame(
  input: ProjectInput,
  placements: Placement[],
): Promise<Uint8Array> {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(1000, 500);
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#eff3e9");
  const l = input.vehicle.lengthMm / 1000,
    w = input.vehicle.widthMm / 1000,
    h = input.vehicle.heightMm / 1000;
  const camera = new THREE.PerspectiveCamera(40, 2, 0.001, 1000);
  const d = Math.max(l, w, h);
  camera.position.set(-d, d * 1.1, d);
  camera.lookAt(l / 2, h / 3, -w / 2);
  const resources: { dispose: () => void }[] = [];
  const box = (
    x: number,
    y: number,
    z: number,
    a: number,
    b: number,
    c: number,
    color: string,
  ) => {
    const geometry = new THREE.BoxGeometry(a, b, c),
      material = new THREE.MeshStandardMaterial({ color });
    resources.push(geometry, material);
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    scene.add(m);
    const edges = new THREE.EdgesGeometry(geometry),
      edgeMaterial = new THREE.LineBasicMaterial({ color: "#6a7c68" });
    resources.push(edges, edgeMaterial);
    const lines = new THREE.LineSegments(edges, edgeMaterial);
    lines.position.copy(m.position);
    scene.add(lines);
  };
  try {
    scene.add(new THREE.AmbientLight("#fff", 2));
    const light = new THREE.DirectionalLight("#fff", 3);
    light.position.set(-2, 5, 5);
    scene.add(light);
    box(l / 2, -0.02, -w / 2, l, 0.04, w, "#d3dcc9");
    for (const p of placements) {
      const type = input.cargoTypes.find(
        (t) =>
          t.id === input.instances.find((i) => i.id === p.instanceId)!.typeId,
      )!;
      const [a, b, c] = orientedDimensions(type, p.orientation).map(
        (n) => n / 1000,
      );
      box(
        p.position.x / 1000 + a / 2,
        p.position.z / 1000 + c / 2,
        -p.position.y / 1000 - b / 2,
        a,
        c,
        b,
        ["#7eab8c", "#dbb97f", "#98a9c5"][type.stop % 3],
      );
    }
    renderer.render(scene, camera);
    const blob = await new Promise<Blob>((resolve, reject) =>
      renderer.domElement.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("Не удалось сохранить кадр")),
        "image/png",
      ),
    );
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    resources.forEach((r) => r.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
