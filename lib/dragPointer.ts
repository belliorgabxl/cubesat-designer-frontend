// The live pointer position during a library drag. Kept outside React state so
// that mouse movement does not re-render anything; the 3D scene reads it per frame.
export const dragPointer = { x: 0, y: 0 };
