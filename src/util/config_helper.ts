/* eslint-disable */
/**
 * Take src and trg configs and recursively checks whether all fields from
 * src are contained in trg. Any time that's not the case the value from src will
 * be used to populate the field in trg.
 *
 * If trg is null or undefined a copy of src is returned.
 *
 * @param src Source config.
 * @param trg Target config.
 *
 * Note: This function doesn't modify any arguments in place but returns a copy.
 */
export function ApplyConfigDefaults(
  src: any,
  trg: any
): any {
  if (trg === null || trg === undefined) {
    if (src === null || src === undefined) {
      return src;
    } else {
      return JSON.parse(JSON.stringify(src));
    }
  }
  src = JSON.parse(JSON.stringify(src));
  trg = JSON.parse(JSON.stringify(trg));
  ApplyConfigDefaultsInternal_(src, trg);
  return trg;
}

function ApplyConfigDefaultsInternal_(
  src: any,
  trg: any
) : any {
  if (src === null || src === undefined || 
      trg === null || trg === undefined) {
    return;
  }
  if (typeof src !== 'object' || typeof trg !== 'object') {
    return;
  }
  for (const key of Object.keys(src)) {
    if (key in trg) {
      ApplyConfigDefaultsInternal_(src[key], trg[key]);
    } else if (key) {
      trg[key] = src[key];
    }
  }
}
