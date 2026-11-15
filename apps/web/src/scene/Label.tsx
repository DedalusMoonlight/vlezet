import { useMemo, useEffect } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
export function Label({
  text,
  position,
  scale = 0.45,
}: {
  text: string;
  position: [number, number, number];
  scale?: number;
}) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 100;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fffffff0";
    ctx.fillRect(0, 0, 512, 100);
    ctx.fillStyle = "#244c3a";
    ctx.font = "500 38px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text.slice(0, 30), 256, 50, 490);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[scale, scale / 5.12, 1]}>
      <spriteMaterial map={texture} depthTest={false} />
    </sprite>
  );
}
