// ---------------------------------------------------------------------------
// Employee names arrive as FIRSTNAME + LASTNAME, but LASTNAME is a placeholder
// for 7,318 of the 7,324 employees - '-' on most of them, 'Nil' on the rest -
// and a handful of first names carry a '(Temp)' marker. Stripping those whole
// tokens leaves the real name; parts of a genuine name are never touched.
// ---------------------------------------------------------------------------

const NAME_NOISE = /^(-+|\.+|nil|n\/a|\(?temp\)?)$/i;

export function cleanEmployeeName(name) {
  if (!name) return '';
  return String(name)
    .split(/\s+/)
    .filter((part) => part && !NAME_NOISE.test(part))
    .join(' ')
    .trim();
}

export default cleanEmployeeName;
