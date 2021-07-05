const hasOwn = Object.prototype.hasOwnProperty;

export const is = (x: any, y: any): boolean => {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
};

/**
 * Return true, if `objectA` is shallow equal to `objectB`.
 */
export const isShallowEqual = (
  objectA: any,
  objectB: any,
): boolean => {
  if (objectA === objectB) {
    return true;
  }
  if (typeof objectA !== "object" || objectA === null) {
    return false;
  }
  if (typeof objectB !== "object" || objectB === null) {
    return false;
  }

  const keysA = Object.keys(objectA);
  const keysB = Object.keys(objectB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (key && !hasOwn.call(objectB, key) || key && !is(objectA[key], objectB[key])) {
      return false;
    }
  }

  return true;
};