export type FaceId = "+X" | "-X" | "+Y" | "-Y" | "+Z" | "-Z";
export type Vec3Mm = { x: number; y: number; z: number };
export type Orientation = { downFace: FaceId; yawQuarterTurns: 0 | 1 | 2 | 3 };
export type CargoType = {
  id: string;
  name: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  massG: number;
  quantity: number;
  stop: number;
  required: boolean;
  allowedDownFaces: FaceId[];
  maxTopLoadG: number | null;
};
export type CargoInstance = { id: string; typeId: string };
export type Vehicle = {
  presetId?: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  payloadG: number;
};
export type ProjectInput = {
  schemaVersion: 1;
  revisionId: string;
  vehicle: Vehicle;
  cargoTypes: CargoType[];
  instances: CargoInstance[];
  settings: {
    wallGapMm: number;
    horizontalGapMm: number;
    supportModel: "support-v1";
  };
};
export type Placement = {
  instanceId: string;
  position: Vec3Mm;
  orientation: Orientation;
};
export type ParseResult =
  { ok: true; value: number } | { ok: false; error: string; rounded?: number };
