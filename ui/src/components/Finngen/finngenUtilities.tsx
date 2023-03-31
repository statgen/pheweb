
export const isFinngenServer = (s : string | undefined) => (s && s.toLowerCase().includes(".finngen.fi")) || false;