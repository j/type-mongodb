// Borrowed from https://github.com/jonschlinkert/is-plain-object

function isObject(o: any) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

export function isPlainObject(o: any) {
  if (isObject(o) === false) {
    return false;
  }

  // If has modified constructor
  const ctor = o.constructor;
  if (o.constructor === undefined) {
    return true;
  }

  // If has modified prototype
  const proto = ctor.prototype;
  if (isObject(proto) === false) {
    return false;
  }

  // If constructor does not have an Object-specific method
  if (proto.hasOwnProperty('isPrototypeOf') === false) {
    return false;
  }

  // Most likely a plain Object
  return true;
}
