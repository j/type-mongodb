// Borrowed from https://github.com/jonschlinkert/is-plain-object

function isObject(o: any) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

export function isPlainObject(o: any) {
  let ctor: any;
  let prot: any;

  if (isObject(o) === false) {
    return false;
  }

  // If has modified constructor
  ctor = o.constructor;
  if (ctor === undefined) {
    return true;
  }

  // If has modified prototype
  prot = ctor.prototype;
  if (isObject(prot) === false) {
    return false;
  }

  // If constructor does not have an Object-specific method
  if (prot.hasOwnProperty('isPrototypeOf') === false) {
    return false;
  }

  // Most likely a plain Object
  return true;
}
