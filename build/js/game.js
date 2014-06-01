(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str.toString()
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.compare = function (a, b) {
  assert(Buffer.isBuffer(a) && Buffer.isBuffer(b), 'Arguments must be Buffers')
  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) {
    return -1
  }
  if (y < x) {
    return 1
  }
  return 0
}

// BUFFER INSTANCE METHODS
// =======================

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end === undefined) ? self.length : Number(end)

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = asciiSlice(self, start, end)
      break
    case 'binary':
      ret = binarySlice(self, start, end)
      break
    case 'base64':
      ret = base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

Buffer.prototype.equals = function (b) {
  assert(Buffer.isBuffer(b), 'Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.compare = function (b) {
  assert(Buffer.isBuffer(b), 'Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function binarySlice (buf, start, end) {
  return asciiSlice(buf, start, end)
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return readUInt16(this, offset, false, noAssert)
}

function readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return readInt16(this, offset, false, noAssert)
}

function readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return readInt32(this, offset, false, noAssert)
}

function readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return readFloat(this, offset, false, noAssert)
}

function readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
  return offset + 1
}

function writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
  return offset + 2
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  return writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  return writeUInt16(this, value, offset, false, noAssert)
}

function writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
  return offset + 4
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  return writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  return writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
  return offset + 1
}

function writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
  return offset + 2
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  return writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  return writeInt16(this, value, offset, false, noAssert)
}

function writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
  return offset + 4
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  return writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  return writeInt32(this, value, offset, false, noAssert)
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F) {
      byteArray.push(b)
    } else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16))
      }
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":2,"ieee754":3}],2:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var ZERO   = '0'.charCodeAt(0)
	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	module.exports.toByteArray = b64ToByteArray
	module.exports.fromByteArray = uint8ToBase64
}())

},{}],3:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],4:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],5:[function(require,module,exports){
(function (process,global){
(function(global) {
  'use strict';
  if (global.$traceurRuntime) {
    return;
  }
  var $Object = Object;
  var $TypeError = TypeError;
  var $create = $Object.create;
  var $defineProperties = $Object.defineProperties;
  var $defineProperty = $Object.defineProperty;
  var $freeze = $Object.freeze;
  var $getOwnPropertyDescriptor = $Object.getOwnPropertyDescriptor;
  var $getOwnPropertyNames = $Object.getOwnPropertyNames;
  var $getPrototypeOf = $Object.getPrototypeOf;
  var $hasOwnProperty = $Object.prototype.hasOwnProperty;
  var $toString = $Object.prototype.toString;
  function nonEnum(value) {
    return {
      configurable: true,
      enumerable: false,
      value: value,
      writable: true
    };
  }
  var types = {
    void: function voidType() {},
    any: function any() {},
    string: function string() {},
    number: function number() {},
    boolean: function boolean() {}
  };
  var method = nonEnum;
  var counter = 0;
  function newUniqueString() {
    return '__$' + Math.floor(Math.random() * 1e9) + '$' + ++counter + '$__';
  }
  var symbolInternalProperty = newUniqueString();
  var symbolDescriptionProperty = newUniqueString();
  var symbolDataProperty = newUniqueString();
  var symbolValues = $create(null);
  function isSymbol(symbol) {
    return typeof symbol === 'object' && symbol instanceof SymbolValue;
  }
  function typeOf(v) {
    if (isSymbol(v))
      return 'symbol';
    return typeof v;
  }
  function Symbol(description) {
    var value = new SymbolValue(description);
    if (!(this instanceof Symbol))
      return value;
    throw new TypeError('Symbol cannot be new\'ed');
  }
  $defineProperty(Symbol.prototype, 'constructor', nonEnum(Symbol));
  $defineProperty(Symbol.prototype, 'toString', method(function() {
    var symbolValue = this[symbolDataProperty];
    if (!getOption('symbols'))
      return symbolValue[symbolInternalProperty];
    if (!symbolValue)
      throw TypeError('Conversion from symbol to string');
    var desc = symbolValue[symbolDescriptionProperty];
    if (desc === undefined)
      desc = '';
    return 'Symbol(' + desc + ')';
  }));
  $defineProperty(Symbol.prototype, 'valueOf', method(function() {
    var symbolValue = this[symbolDataProperty];
    if (!symbolValue)
      throw TypeError('Conversion from symbol to string');
    if (!getOption('symbols'))
      return symbolValue[symbolInternalProperty];
    return symbolValue;
  }));
  function SymbolValue(description) {
    var key = newUniqueString();
    $defineProperty(this, symbolDataProperty, {value: this});
    $defineProperty(this, symbolInternalProperty, {value: key});
    $defineProperty(this, symbolDescriptionProperty, {value: description});
    $freeze(this);
    symbolValues[key] = this;
  }
  $defineProperty(SymbolValue.prototype, 'constructor', nonEnum(Symbol));
  $defineProperty(SymbolValue.prototype, 'toString', {
    value: Symbol.prototype.toString,
    enumerable: false
  });
  $defineProperty(SymbolValue.prototype, 'valueOf', {
    value: Symbol.prototype.valueOf,
    enumerable: false
  });
  $freeze(SymbolValue.prototype);
  Symbol.iterator = Symbol();
  function toProperty(name) {
    if (isSymbol(name))
      return name[symbolInternalProperty];
    return name;
  }
  function getOwnPropertyNames(object) {
    var rv = [];
    var names = $getOwnPropertyNames(object);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      if (!symbolValues[name])
        rv.push(name);
    }
    return rv;
  }
  function getOwnPropertyDescriptor(object, name) {
    return $getOwnPropertyDescriptor(object, toProperty(name));
  }
  function getOwnPropertySymbols(object) {
    var rv = [];
    var names = $getOwnPropertyNames(object);
    for (var i = 0; i < names.length; i++) {
      var symbol = symbolValues[names[i]];
      if (symbol)
        rv.push(symbol);
    }
    return rv;
  }
  function hasOwnProperty(name) {
    return $hasOwnProperty.call(this, toProperty(name));
  }
  function getOption(name) {
    return global.traceur && global.traceur.options[name];
  }
  function setProperty(object, name, value) {
    var sym,
        desc;
    if (isSymbol(name)) {
      sym = name;
      name = name[symbolInternalProperty];
    }
    object[name] = value;
    if (sym && (desc = $getOwnPropertyDescriptor(object, name)))
      $defineProperty(object, name, {enumerable: false});
    return value;
  }
  function defineProperty(object, name, descriptor) {
    if (isSymbol(name)) {
      if (descriptor.enumerable) {
        descriptor = $create(descriptor, {enumerable: {value: false}});
      }
      name = name[symbolInternalProperty];
    }
    $defineProperty(object, name, descriptor);
    return object;
  }
  function polyfillObject(Object) {
    $defineProperty(Object, 'defineProperty', {value: defineProperty});
    $defineProperty(Object, 'getOwnPropertyNames', {value: getOwnPropertyNames});
    $defineProperty(Object, 'getOwnPropertyDescriptor', {value: getOwnPropertyDescriptor});
    $defineProperty(Object.prototype, 'hasOwnProperty', {value: hasOwnProperty});
    Object.getOwnPropertySymbols = getOwnPropertySymbols;
    function is(left, right) {
      if (left === right)
        return left !== 0 || 1 / left === 1 / right;
      return left !== left && right !== right;
    }
    $defineProperty(Object, 'is', method(is));
    function assign(target, source) {
      var props = $getOwnPropertyNames(source);
      var p,
          length = props.length;
      for (p = 0; p < length; p++) {
        target[props[p]] = source[props[p]];
      }
      return target;
    }
    $defineProperty(Object, 'assign', method(assign));
    function mixin(target, source) {
      var props = $getOwnPropertyNames(source);
      var p,
          descriptor,
          length = props.length;
      for (p = 0; p < length; p++) {
        descriptor = $getOwnPropertyDescriptor(source, props[p]);
        $defineProperty(target, props[p], descriptor);
      }
      return target;
    }
    $defineProperty(Object, 'mixin', method(mixin));
  }
  function exportStar(object) {
    for (var i = 1; i < arguments.length; i++) {
      var names = $getOwnPropertyNames(arguments[i]);
      for (var j = 0; j < names.length; j++) {
        (function(mod, name) {
          $defineProperty(object, name, {
            get: function() {
              return mod[name];
            },
            enumerable: true
          });
        })(arguments[i], names[j]);
      }
    }
    return object;
  }
  function toObject(value) {
    if (value == null)
      throw $TypeError();
    return $Object(value);
  }
  function spread() {
    var rv = [],
        k = 0;
    for (var i = 0; i < arguments.length; i++) {
      var valueToSpread = toObject(arguments[i]);
      for (var j = 0; j < valueToSpread.length; j++) {
        rv[k++] = valueToSpread[j];
      }
    }
    return rv;
  }
  function getPropertyDescriptor(object, name) {
    while (object !== null) {
      var result = $getOwnPropertyDescriptor(object, name);
      if (result)
        return result;
      object = $getPrototypeOf(object);
    }
    return undefined;
  }
  function superDescriptor(homeObject, name) {
    var proto = $getPrototypeOf(homeObject);
    if (!proto)
      throw $TypeError('super is null');
    return getPropertyDescriptor(proto, name);
  }
  function superCall(self, homeObject, name, args) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor) {
      if ('value' in descriptor)
        return descriptor.value.apply(self, args);
      if (descriptor.get)
        return descriptor.get.call(self).apply(self, args);
    }
    throw $TypeError("super has no method '" + name + "'.");
  }
  function superGet(self, homeObject, name) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor) {
      if (descriptor.get)
        return descriptor.get.call(self);
      else if ('value' in descriptor)
        return descriptor.value;
    }
    return undefined;
  }
  function superSet(self, homeObject, name, value) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor && descriptor.set) {
      descriptor.set.call(self, value);
      return value;
    }
    throw $TypeError("super has no setter '" + name + "'.");
  }
  function getDescriptors(object) {
    var descriptors = {},
        name,
        names = $getOwnPropertyNames(object);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      descriptors[name] = $getOwnPropertyDescriptor(object, name);
    }
    return descriptors;
  }
  function createClass(ctor, object, staticObject, superClass) {
    $defineProperty(object, 'constructor', {
      value: ctor,
      configurable: true,
      enumerable: false,
      writable: true
    });
    if (arguments.length > 3) {
      if (typeof superClass === 'function')
        ctor.__proto__ = superClass;
      ctor.prototype = $create(getProtoParent(superClass), getDescriptors(object));
    } else {
      ctor.prototype = object;
    }
    $defineProperty(ctor, 'prototype', {
      configurable: false,
      writable: false
    });
    return $defineProperties(ctor, getDescriptors(staticObject));
  }
  function getProtoParent(superClass) {
    if (typeof superClass === 'function') {
      var prototype = superClass.prototype;
      if ($Object(prototype) === prototype || prototype === null)
        return superClass.prototype;
    }
    if (superClass === null)
      return null;
    throw new TypeError();
  }
  function defaultSuperCall(self, homeObject, args) {
    if ($getPrototypeOf(homeObject) !== null)
      superCall(self, homeObject, 'constructor', args);
  }
  var ST_NEWBORN = 0;
  var ST_EXECUTING = 1;
  var ST_SUSPENDED = 2;
  var ST_CLOSED = 3;
  var END_STATE = -2;
  var RETHROW_STATE = -3;
  function addIterator(object) {
    return defineProperty(object, Symbol.iterator, nonEnum(function() {
      return this;
    }));
  }
  function getInternalError(state) {
    return new Error('Traceur compiler bug: invalid state in state machine: ' + state);
  }
  function GeneratorContext() {
    this.state = 0;
    this.GState = ST_NEWBORN;
    this.storedException = undefined;
    this.finallyFallThrough = undefined;
    this.sent_ = undefined;
    this.returnValue = undefined;
    this.tryStack_ = [];
  }
  GeneratorContext.prototype = {
    pushTry: function(catchState, finallyState) {
      if (finallyState !== null) {
        var finallyFallThrough = null;
        for (var i = this.tryStack_.length - 1; i >= 0; i--) {
          if (this.tryStack_[i].catch !== undefined) {
            finallyFallThrough = this.tryStack_[i].catch;
            break;
          }
        }
        if (finallyFallThrough === null)
          finallyFallThrough = RETHROW_STATE;
        this.tryStack_.push({
          finally: finallyState,
          finallyFallThrough: finallyFallThrough
        });
      }
      if (catchState !== null) {
        this.tryStack_.push({catch: catchState});
      }
    },
    popTry: function() {
      this.tryStack_.pop();
    },
    get sent() {
      this.maybeThrow();
      return this.sent_;
    },
    set sent(v) {
      this.sent_ = v;
    },
    get sentIgnoreThrow() {
      return this.sent_;
    },
    maybeThrow: function() {
      if (this.action === 'throw') {
        this.action = 'next';
        throw this.sent_;
      }
    },
    end: function() {
      switch (this.state) {
        case END_STATE:
          return this;
        case RETHROW_STATE:
          throw this.storedException;
        default:
          throw getInternalError(this.state);
      }
    }
  };
  function getNextOrThrow(ctx, moveNext, action) {
    return function(x) {
      switch (ctx.GState) {
        case ST_EXECUTING:
          throw new Error(("\"" + action + "\" on executing generator"));
        case ST_CLOSED:
          throw new Error(("\"" + action + "\" on closed generator"));
        case ST_NEWBORN:
          if (action === 'throw') {
            ctx.GState = ST_CLOSED;
            throw x;
          }
          if (x !== undefined)
            throw $TypeError('Sent value to newborn generator');
        case ST_SUSPENDED:
          ctx.GState = ST_EXECUTING;
          ctx.action = action;
          ctx.sent = x;
          var value = moveNext(ctx);
          var done = value === ctx;
          if (done)
            value = ctx.returnValue;
          ctx.GState = done ? ST_CLOSED : ST_SUSPENDED;
          return {
            value: value,
            done: done
          };
      }
    };
  }
  function generatorWrap(innerFunction, self) {
    var moveNext = getMoveNext(innerFunction, self);
    var ctx = new GeneratorContext();
    return addIterator({
      next: getNextOrThrow(ctx, moveNext, 'next'),
      throw: getNextOrThrow(ctx, moveNext, 'throw')
    });
  }
  function AsyncFunctionContext() {
    GeneratorContext.call(this);
    this.err = undefined;
    var ctx = this;
    ctx.result = new Promise(function(resolve, reject) {
      ctx.resolve = resolve;
      ctx.reject = reject;
    });
  }
  AsyncFunctionContext.prototype = Object.create(GeneratorContext.prototype);
  AsyncFunctionContext.prototype.end = function() {
    switch (this.state) {
      case END_STATE:
        return;
      case RETHROW_STATE:
        this.reject(this.storedException);
      default:
        this.reject(getInternalError(this.state));
    }
  };
  function asyncWrap(innerFunction, self) {
    var moveNext = getMoveNext(innerFunction, self);
    var ctx = new AsyncFunctionContext();
    ctx.createCallback = function(newState) {
      return function(value) {
        ctx.state = newState;
        ctx.value = value;
        moveNext(ctx);
      };
    };
    ctx.createErrback = function(newState) {
      return function(err) {
        ctx.state = newState;
        ctx.err = err;
        moveNext(ctx);
      };
    };
    moveNext(ctx);
    return ctx.result;
  }
  function getMoveNext(innerFunction, self) {
    return function(ctx) {
      while (true) {
        try {
          return innerFunction.call(self, ctx);
        } catch (ex) {
          ctx.storedException = ex;
          var last = ctx.tryStack_[ctx.tryStack_.length - 1];
          if (!last) {
            ctx.GState = ST_CLOSED;
            ctx.state = END_STATE;
            throw ex;
          }
          ctx.state = last.catch !== undefined ? last.catch : last.finally;
          if (last.finallyFallThrough !== undefined)
            ctx.finallyFallThrough = last.finallyFallThrough;
        }
      }
    };
  }
  function setupGlobals(global) {
    global.Symbol = Symbol;
    polyfillObject(global.Object);
  }
  setupGlobals(global);
  global.$traceurRuntime = {
    asyncWrap: asyncWrap,
    createClass: createClass,
    defaultSuperCall: defaultSuperCall,
    exportStar: exportStar,
    generatorWrap: generatorWrap,
    setProperty: setProperty,
    setupGlobals: setupGlobals,
    spread: spread,
    superCall: superCall,
    superGet: superGet,
    superSet: superSet,
    toObject: toObject,
    toProperty: toProperty,
    type: types,
    typeof: typeOf
  };
})(typeof global !== 'undefined' ? global : this);
(function() {
  function buildFromEncodedParts(opt_scheme, opt_userInfo, opt_domain, opt_port, opt_path, opt_queryData, opt_fragment) {
    var out = [];
    if (opt_scheme) {
      out.push(opt_scheme, ':');
    }
    if (opt_domain) {
      out.push('//');
      if (opt_userInfo) {
        out.push(opt_userInfo, '@');
      }
      out.push(opt_domain);
      if (opt_port) {
        out.push(':', opt_port);
      }
    }
    if (opt_path) {
      out.push(opt_path);
    }
    if (opt_queryData) {
      out.push('?', opt_queryData);
    }
    if (opt_fragment) {
      out.push('#', opt_fragment);
    }
    return out.join('');
  }
  ;
  var splitRe = new RegExp('^' + '(?:' + '([^:/?#.]+)' + ':)?' + '(?://' + '(?:([^/?#]*)@)?' + '([\\w\\d\\-\\u0100-\\uffff.%]*)' + '(?::([0-9]+))?' + ')?' + '([^?#]+)?' + '(?:\\?([^#]*))?' + '(?:#(.*))?' + '$');
  var ComponentIndex = {
    SCHEME: 1,
    USER_INFO: 2,
    DOMAIN: 3,
    PORT: 4,
    PATH: 5,
    QUERY_DATA: 6,
    FRAGMENT: 7
  };
  function split(uri) {
    return (uri.match(splitRe));
  }
  function removeDotSegments(path) {
    if (path === '/')
      return '/';
    var leadingSlash = path[0] === '/' ? '/' : '';
    var trailingSlash = path.slice(-1) === '/' ? '/' : '';
    var segments = path.split('/');
    var out = [];
    var up = 0;
    for (var pos = 0; pos < segments.length; pos++) {
      var segment = segments[pos];
      switch (segment) {
        case '':
        case '.':
          break;
        case '..':
          if (out.length)
            out.pop();
          else
            up++;
          break;
        default:
          out.push(segment);
      }
    }
    if (!leadingSlash) {
      while (up-- > 0) {
        out.unshift('..');
      }
      if (out.length === 0)
        out.push('.');
    }
    return leadingSlash + out.join('/') + trailingSlash;
  }
  function joinAndCanonicalizePath(parts) {
    var path = parts[ComponentIndex.PATH] || '';
    path = removeDotSegments(path);
    parts[ComponentIndex.PATH] = path;
    return buildFromEncodedParts(parts[ComponentIndex.SCHEME], parts[ComponentIndex.USER_INFO], parts[ComponentIndex.DOMAIN], parts[ComponentIndex.PORT], parts[ComponentIndex.PATH], parts[ComponentIndex.QUERY_DATA], parts[ComponentIndex.FRAGMENT]);
  }
  function canonicalizeUrl(url) {
    var parts = split(url);
    return joinAndCanonicalizePath(parts);
  }
  function resolveUrl(base, url) {
    var parts = split(url);
    var baseParts = split(base);
    if (parts[ComponentIndex.SCHEME]) {
      return joinAndCanonicalizePath(parts);
    } else {
      parts[ComponentIndex.SCHEME] = baseParts[ComponentIndex.SCHEME];
    }
    for (var i = ComponentIndex.SCHEME; i <= ComponentIndex.PORT; i++) {
      if (!parts[i]) {
        parts[i] = baseParts[i];
      }
    }
    if (parts[ComponentIndex.PATH][0] == '/') {
      return joinAndCanonicalizePath(parts);
    }
    var path = baseParts[ComponentIndex.PATH];
    var index = path.lastIndexOf('/');
    path = path.slice(0, index + 1) + parts[ComponentIndex.PATH];
    parts[ComponentIndex.PATH] = path;
    return joinAndCanonicalizePath(parts);
  }
  function isAbsolute(name) {
    if (!name)
      return false;
    if (name[0] === '/')
      return true;
    var parts = split(name);
    if (parts[ComponentIndex.SCHEME])
      return true;
    return false;
  }
  $traceurRuntime.canonicalizeUrl = canonicalizeUrl;
  $traceurRuntime.isAbsolute = isAbsolute;
  $traceurRuntime.removeDotSegments = removeDotSegments;
  $traceurRuntime.resolveUrl = resolveUrl;
})();
(function(global) {
  'use strict';
  var $__2 = $traceurRuntime,
      canonicalizeUrl = $__2.canonicalizeUrl,
      resolveUrl = $__2.resolveUrl,
      isAbsolute = $__2.isAbsolute;
  var moduleInstantiators = Object.create(null);
  var baseURL;
  if (global.location && global.location.href)
    baseURL = resolveUrl(global.location.href, './');
  else
    baseURL = '';
  var UncoatedModuleEntry = function UncoatedModuleEntry(url, uncoatedModule) {
    this.url = url;
    this.value_ = uncoatedModule;
  };
  ($traceurRuntime.createClass)(UncoatedModuleEntry, {}, {});
  var UncoatedModuleInstantiator = function UncoatedModuleInstantiator(url, func) {
    $traceurRuntime.superCall(this, $UncoatedModuleInstantiator.prototype, "constructor", [url, null]);
    this.func = func;
  };
  var $UncoatedModuleInstantiator = UncoatedModuleInstantiator;
  ($traceurRuntime.createClass)(UncoatedModuleInstantiator, {getUncoatedModule: function() {
      if (this.value_)
        return this.value_;
      return this.value_ = this.func.call(global);
    }}, {}, UncoatedModuleEntry);
  function getUncoatedModuleInstantiator(name) {
    if (!name)
      return;
    var url = ModuleStore.normalize(name);
    return moduleInstantiators[url];
  }
  ;
  var moduleInstances = Object.create(null);
  var liveModuleSentinel = {};
  function Module(uncoatedModule) {
    var isLive = arguments[1];
    var coatedModule = Object.create(null);
    Object.getOwnPropertyNames(uncoatedModule).forEach((function(name) {
      var getter,
          value;
      if (isLive === liveModuleSentinel) {
        var descr = Object.getOwnPropertyDescriptor(uncoatedModule, name);
        if (descr.get)
          getter = descr.get;
      }
      if (!getter) {
        value = uncoatedModule[name];
        getter = function() {
          return value;
        };
      }
      Object.defineProperty(coatedModule, name, {
        get: getter,
        enumerable: true
      });
    }));
    Object.preventExtensions(coatedModule);
    return coatedModule;
  }
  var ModuleStore = {
    normalize: function(name, refererName, refererAddress) {
      if (typeof name !== "string")
        throw new TypeError("module name must be a string, not " + typeof name);
      if (isAbsolute(name))
        return canonicalizeUrl(name);
      if (/[^\.]\/\.\.\//.test(name)) {
        throw new Error('module name embeds /../: ' + name);
      }
      if (name[0] === '.' && refererName)
        return resolveUrl(refererName, name);
      return canonicalizeUrl(name);
    },
    get: function(normalizedName) {
      var m = getUncoatedModuleInstantiator(normalizedName);
      if (!m)
        return undefined;
      var moduleInstance = moduleInstances[m.url];
      if (moduleInstance)
        return moduleInstance;
      moduleInstance = Module(m.getUncoatedModule(), liveModuleSentinel);
      return moduleInstances[m.url] = moduleInstance;
    },
    set: function(normalizedName, module) {
      normalizedName = String(normalizedName);
      moduleInstantiators[normalizedName] = new UncoatedModuleInstantiator(normalizedName, (function() {
        return module;
      }));
      moduleInstances[normalizedName] = module;
    },
    get baseURL() {
      return baseURL;
    },
    set baseURL(v) {
      baseURL = String(v);
    },
    registerModule: function(name, func) {
      var normalizedName = ModuleStore.normalize(name);
      if (moduleInstantiators[normalizedName])
        throw new Error('duplicate module named ' + normalizedName);
      moduleInstantiators[normalizedName] = new UncoatedModuleInstantiator(normalizedName, func);
    },
    bundleStore: Object.create(null),
    register: function(name, deps, func) {
      if (!deps || !deps.length) {
        this.registerModule(name, func);
      } else {
        this.bundleStore[name] = {
          deps: deps,
          execute: func
        };
      }
    },
    getAnonymousModule: function(func) {
      return new Module(func.call(global), liveModuleSentinel);
    },
    getForTesting: function(name) {
      var $__0 = this;
      if (!this.testingPrefix_) {
        Object.keys(moduleInstances).some((function(key) {
          var m = /(traceur@[^\/]*\/)/.exec(key);
          if (m) {
            $__0.testingPrefix_ = m[1];
            return true;
          }
        }));
      }
      return this.get(this.testingPrefix_ + name);
    }
  };
  ModuleStore.set('@traceur/src/runtime/ModuleStore', new Module({ModuleStore: ModuleStore}));
  var setupGlobals = $traceurRuntime.setupGlobals;
  $traceurRuntime.setupGlobals = function(global) {
    setupGlobals(global);
  };
  $traceurRuntime.ModuleStore = ModuleStore;
  global.System = {
    register: ModuleStore.register.bind(ModuleStore),
    get: ModuleStore.get,
    set: ModuleStore.set,
    normalize: ModuleStore.normalize
  };
  $traceurRuntime.getModuleImpl = function(name) {
    var instantiator = getUncoatedModuleInstantiator(name);
    return instantiator && instantiator.getUncoatedModule();
  };
})(typeof global !== 'undefined' ? global : this);
System.register("traceur-runtime@0.0.32/src/runtime/polyfills/utils", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.32/src/runtime/polyfills/utils";
  var toObject = $traceurRuntime.toObject;
  function toUint32(x) {
    return x | 0;
  }
  return {
    get toObject() {
      return toObject;
    },
    get toUint32() {
      return toUint32;
    }
  };
});
System.register("traceur-runtime@0.0.32/src/runtime/polyfills/ArrayIterator", [], function() {
  "use strict";
  var $__4;
  var __moduleName = "traceur-runtime@0.0.32/src/runtime/polyfills/ArrayIterator";
  var $__5 = System.get("traceur-runtime@0.0.32/src/runtime/polyfills/utils"),
      toObject = $__5.toObject,
      toUint32 = $__5.toUint32;
  var ARRAY_ITERATOR_KIND_KEYS = 1;
  var ARRAY_ITERATOR_KIND_VALUES = 2;
  var ARRAY_ITERATOR_KIND_ENTRIES = 3;
  var ArrayIterator = function ArrayIterator() {};
  ($traceurRuntime.createClass)(ArrayIterator, ($__4 = {}, Object.defineProperty($__4, "next", {
    value: function() {
      var iterator = toObject(this);
      var array = iterator.iteratorObject_;
      if (!array) {
        throw new TypeError('Object is not an ArrayIterator');
      }
      var index = iterator.arrayIteratorNextIndex_;
      var itemKind = iterator.arrayIterationKind_;
      var length = toUint32(array.length);
      if (index >= length) {
        iterator.arrayIteratorNextIndex_ = Infinity;
        return createIteratorResultObject(undefined, true);
      }
      iterator.arrayIteratorNextIndex_ = index + 1;
      if (itemKind == ARRAY_ITERATOR_KIND_VALUES)
        return createIteratorResultObject(array[index], false);
      if (itemKind == ARRAY_ITERATOR_KIND_ENTRIES)
        return createIteratorResultObject([index, array[index]], false);
      return createIteratorResultObject(index, false);
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), Object.defineProperty($__4, Symbol.iterator, {
    value: function() {
      return this;
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), $__4), {});
  function createArrayIterator(array, kind) {
    var object = toObject(array);
    var iterator = new ArrayIterator;
    iterator.iteratorObject_ = object;
    iterator.arrayIteratorNextIndex_ = 0;
    iterator.arrayIterationKind_ = kind;
    return iterator;
  }
  function createIteratorResultObject(value, done) {
    return {
      value: value,
      done: done
    };
  }
  function entries() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_ENTRIES);
  }
  function keys() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_KEYS);
  }
  function values() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_VALUES);
  }
  return {
    get entries() {
      return entries;
    },
    get keys() {
      return keys;
    },
    get values() {
      return values;
    }
  };
});
System.register("traceur-runtime@0.0.32/node_modules/rsvp/lib/rsvp/asap", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.32/node_modules/rsvp/lib/rsvp/asap";
  var $__default = function asap(callback, arg) {
    var length = queue.push([callback, arg]);
    if (length === 1) {
      scheduleFlush();
    }
  };
  var browserGlobal = (typeof window !== 'undefined') ? window : {};
  var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
  function useNextTick() {
    return function() {
      process.nextTick(flush);
    };
  }
  function useMutationObserver() {
    var iterations = 0;
    var observer = new BrowserMutationObserver(flush);
    var node = document.createTextNode('');
    observer.observe(node, {characterData: true});
    return function() {
      node.data = (iterations = ++iterations % 2);
    };
  }
  function useSetTimeout() {
    return function() {
      setTimeout(flush, 1);
    };
  }
  var queue = [];
  function flush() {
    for (var i = 0; i < queue.length; i++) {
      var tuple = queue[i];
      var callback = tuple[0],
          arg = tuple[1];
      callback(arg);
    }
    queue = [];
  }
  var scheduleFlush;
  if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
    scheduleFlush = useNextTick();
  } else if (BrowserMutationObserver) {
    scheduleFlush = useMutationObserver();
  } else {
    scheduleFlush = useSetTimeout();
  }
  return {get default() {
      return $__default;
    }};
});
System.register("traceur-runtime@0.0.32/src/runtime/polyfills/Promise", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.32/src/runtime/polyfills/Promise";
  var async = System.get("traceur-runtime@0.0.32/node_modules/rsvp/lib/rsvp/asap").default;
  function isPromise(x) {
    return x && typeof x === 'object' && x.status_ !== undefined;
  }
  function chain(promise) {
    var onResolve = arguments[1] !== (void 0) ? arguments[1] : (function(x) {
      return x;
    });
    var onReject = arguments[2] !== (void 0) ? arguments[2] : (function(e) {
      throw e;
    });
    var deferred = getDeferred(promise.constructor);
    switch (promise.status_) {
      case undefined:
        throw TypeError;
      case 'pending':
        promise.onResolve_.push([deferred, onResolve]);
        promise.onReject_.push([deferred, onReject]);
        break;
      case 'resolved':
        promiseReact(deferred, onResolve, promise.value_);
        break;
      case 'rejected':
        promiseReact(deferred, onReject, promise.value_);
        break;
    }
    return deferred.promise;
  }
  function getDeferred(C) {
    var result = {};
    result.promise = new C((function(resolve, reject) {
      result.resolve = resolve;
      result.reject = reject;
    }));
    return result;
  }
  var Promise = function Promise(resolver) {
    var $__6 = this;
    this.status_ = 'pending';
    this.onResolve_ = [];
    this.onReject_ = [];
    resolver((function(x) {
      promiseResolve($__6, x);
    }), (function(r) {
      promiseReject($__6, r);
    }));
  };
  ($traceurRuntime.createClass)(Promise, {
    catch: function(onReject) {
      return this.then(undefined, onReject);
    },
    then: function() {
      var onResolve = arguments[0] !== (void 0) ? arguments[0] : (function(x) {
        return x;
      });
      var onReject = arguments[1];
      var $__6 = this;
      var constructor = this.constructor;
      return chain(this, (function(x) {
        x = promiseCoerce(constructor, x);
        return x === $__6 ? onReject(new TypeError) : isPromise(x) ? x.then(onResolve, onReject) : onResolve(x);
      }), onReject);
    }
  }, {
    resolve: function(x) {
      return new this((function(resolve, reject) {
        resolve(x);
      }));
    },
    reject: function(r) {
      return new this((function(resolve, reject) {
        reject(r);
      }));
    },
    cast: function(x) {
      if (x instanceof this)
        return x;
      if (isPromise(x)) {
        var result = getDeferred(this);
        chain(x, result.resolve, result.reject);
        return result.promise;
      }
      return this.resolve(x);
    },
    all: function(values) {
      var deferred = getDeferred(this);
      var count = 0;
      var resolutions = [];
      try {
        for (var i = 0; i < values.length; i++) {
          ++count;
          this.cast(values[i]).then(function(i, x) {
            resolutions[i] = x;
            if (--count === 0)
              deferred.resolve(resolutions);
          }.bind(undefined, i), (function(r) {
            if (count > 0)
              count = 0;
            deferred.reject(r);
          }));
        }
        if (count === 0)
          deferred.resolve(resolutions);
      } catch (e) {
        deferred.reject(e);
      }
      return deferred.promise;
    },
    race: function(values) {
      var deferred = getDeferred(this);
      try {
        for (var i = 0; i < values.length; i++) {
          this.cast(values[i]).then((function(x) {
            deferred.resolve(x);
          }), (function(r) {
            deferred.reject(r);
          }));
        }
      } catch (e) {
        deferred.reject(e);
      }
      return deferred.promise;
    }
  });
  function promiseResolve(promise, x) {
    promiseDone(promise, 'resolved', x, promise.onResolve_);
  }
  function promiseReject(promise, r) {
    promiseDone(promise, 'rejected', r, promise.onReject_);
  }
  function promiseDone(promise, status, value, reactions) {
    if (promise.status_ !== 'pending')
      return;
    for (var i = 0; i < reactions.length; i++) {
      promiseReact(reactions[i][0], reactions[i][1], value);
    }
    promise.status_ = status;
    promise.value_ = value;
    promise.onResolve_ = promise.onReject_ = undefined;
  }
  function promiseReact(deferred, handler, x) {
    async((function() {
      try {
        var y = handler(x);
        if (y === deferred.promise)
          throw new TypeError;
        else if (isPromise(y))
          chain(y, deferred.resolve, deferred.reject);
        else
          deferred.resolve(y);
      } catch (e) {
        deferred.reject(e);
      }
    }));
  }
  var thenableSymbol = '@@thenable';
  function promiseCoerce(constructor, x) {
    if (isPromise(x)) {
      return x;
    } else if (x && typeof x.then === 'function') {
      var p = x[thenableSymbol];
      if (p) {
        return p;
      } else {
        var deferred = getDeferred(constructor);
        x[thenableSymbol] = deferred.promise;
        try {
          x.then(deferred.resolve, deferred.reject);
        } catch (e) {
          deferred.reject(e);
        }
        return deferred.promise;
      }
    } else {
      return x;
    }
  }
  return {get Promise() {
      return Promise;
    }};
});
System.register("traceur-runtime@0.0.32/src/runtime/polyfills/String", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.32/src/runtime/polyfills/String";
  var $toString = Object.prototype.toString;
  var $indexOf = String.prototype.indexOf;
  var $lastIndexOf = String.prototype.lastIndexOf;
  function startsWith(search) {
    var string = String(this);
    if (this == null || $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var position = arguments.length > 1 ? arguments[1] : undefined;
    var pos = position ? Number(position) : 0;
    if (isNaN(pos)) {
      pos = 0;
    }
    var start = Math.min(Math.max(pos, 0), stringLength);
    return $indexOf.call(string, searchString, pos) == start;
  }
  function endsWith(search) {
    var string = String(this);
    if (this == null || $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var pos = stringLength;
    if (arguments.length > 1) {
      var position = arguments[1];
      if (position !== undefined) {
        pos = position ? Number(position) : 0;
        if (isNaN(pos)) {
          pos = 0;
        }
      }
    }
    var end = Math.min(Math.max(pos, 0), stringLength);
    var start = end - searchLength;
    if (start < 0) {
      return false;
    }
    return $lastIndexOf.call(string, searchString, start) == start;
  }
  function contains(search) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var position = arguments.length > 1 ? arguments[1] : undefined;
    var pos = position ? Number(position) : 0;
    if (isNaN(pos)) {
      pos = 0;
    }
    var start = Math.min(Math.max(pos, 0), stringLength);
    return $indexOf.call(string, searchString, pos) != -1;
  }
  function repeat(count) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var n = count ? Number(count) : 0;
    if (isNaN(n)) {
      n = 0;
    }
    if (n < 0 || n == Infinity) {
      throw RangeError();
    }
    if (n == 0) {
      return '';
    }
    var result = '';
    while (n--) {
      result += string;
    }
    return result;
  }
  function codePointAt(position) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var size = string.length;
    var index = position ? Number(position) : 0;
    if (isNaN(index)) {
      index = 0;
    }
    if (index < 0 || index >= size) {
      return undefined;
    }
    var first = string.charCodeAt(index);
    var second;
    if (first >= 0xD800 && first <= 0xDBFF && size > index + 1) {
      second = string.charCodeAt(index + 1);
      if (second >= 0xDC00 && second <= 0xDFFF) {
        return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
      }
    }
    return first;
  }
  function raw(callsite) {
    var raw = callsite.raw;
    var len = raw.length >>> 0;
    if (len === 0)
      return '';
    var s = '';
    var i = 0;
    while (true) {
      s += raw[i];
      if (i + 1 === len)
        return s;
      s += arguments[++i];
    }
  }
  function fromCodePoint() {
    var codeUnits = [];
    var floor = Math.floor;
    var highSurrogate;
    var lowSurrogate;
    var index = -1;
    var length = arguments.length;
    if (!length) {
      return '';
    }
    while (++index < length) {
      var codePoint = Number(arguments[index]);
      if (!isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF || floor(codePoint) != codePoint) {
        throw RangeError('Invalid code point: ' + codePoint);
      }
      if (codePoint <= 0xFFFF) {
        codeUnits.push(codePoint);
      } else {
        codePoint -= 0x10000;
        highSurrogate = (codePoint >> 10) + 0xD800;
        lowSurrogate = (codePoint % 0x400) + 0xDC00;
        codeUnits.push(highSurrogate, lowSurrogate);
      }
    }
    return String.fromCharCode.apply(null, codeUnits);
  }
  return {
    get startsWith() {
      return startsWith;
    },
    get endsWith() {
      return endsWith;
    },
    get contains() {
      return contains;
    },
    get repeat() {
      return repeat;
    },
    get codePointAt() {
      return codePointAt;
    },
    get raw() {
      return raw;
    },
    get fromCodePoint() {
      return fromCodePoint;
    }
  };
});
System.register("traceur-runtime@0.0.32/src/runtime/polyfills/polyfills", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.32/src/runtime/polyfills/polyfills";
  var Promise = System.get("traceur-runtime@0.0.32/src/runtime/polyfills/Promise").Promise;
  var $__9 = System.get("traceur-runtime@0.0.32/src/runtime/polyfills/String"),
      codePointAt = $__9.codePointAt,
      contains = $__9.contains,
      endsWith = $__9.endsWith,
      fromCodePoint = $__9.fromCodePoint,
      repeat = $__9.repeat,
      raw = $__9.raw,
      startsWith = $__9.startsWith;
  var $__9 = System.get("traceur-runtime@0.0.32/src/runtime/polyfills/ArrayIterator"),
      entries = $__9.entries,
      keys = $__9.keys,
      values = $__9.values;
  function maybeDefineMethod(object, name, value) {
    if (!(name in object)) {
      Object.defineProperty(object, name, {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
  }
  function maybeAddFunctions(object, functions) {
    for (var i = 0; i < functions.length; i += 2) {
      var name = functions[i];
      var value = functions[i + 1];
      maybeDefineMethod(object, name, value);
    }
  }
  function polyfillPromise(global) {
    if (!global.Promise)
      global.Promise = Promise;
  }
  function polyfillString(String) {
    maybeAddFunctions(String.prototype, ['codePointAt', codePointAt, 'contains', contains, 'endsWith', endsWith, 'startsWith', startsWith, 'repeat', repeat]);
    maybeAddFunctions(String, ['fromCodePoint', fromCodePoint, 'raw', raw]);
  }
  function polyfillArray(Array, Symbol) {
    maybeAddFunctions(Array.prototype, ['entries', entries, 'keys', keys, 'values', values]);
    if (Symbol && Symbol.iterator) {
      Object.defineProperty(Array.prototype, Symbol.iterator, {
        value: values,
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
  }
  function polyfill(global) {
    polyfillPromise(global);
    polyfillString(global.String);
    polyfillArray(global.Array, global.Symbol);
  }
  polyfill(this);
  var setupGlobals = $traceurRuntime.setupGlobals;
  $traceurRuntime.setupGlobals = function(global) {
    setupGlobals(global);
    polyfill(global);
  };
  return {};
});
System.register("traceur-runtime@0.0.32/src/runtime/polyfill-import", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.32/src/runtime/polyfill-import";
  var $__11 = System.get("traceur-runtime@0.0.32/src/runtime/polyfills/polyfills");
  return {};
});
System.get("traceur-runtime@0.0.32/src/runtime/polyfill-import" + '');

}).call(this,require("FWaASH"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"FWaASH":4}],6:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/index";
module.exports = require('./src/PathFinding');


},{"./src/PathFinding":9}],7:[function(require,module,exports){
module.exports = require('./lib/heap');

},{"./lib/heap":8}],8:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var Heap, defaultCmp, floor, heapify, heappop, heappush, heappushpop, heapreplace, insort, min, nlargest, nsmallest, updateItem, _siftdown, _siftup;

  floor = Math.floor, min = Math.min;

  /* 
  Default comparison function to be used
  */


  defaultCmp = function(x, y) {
    if (x < y) {
      return -1;
    }
    if (x > y) {
      return 1;
    }
    return 0;
  };

  /* 
  Insert item x in list a, and keep it sorted assuming a is sorted.
  
  If x is already in a, insert it to the right of the rightmost x.
  
  Optional args lo (default 0) and hi (default a.length) bound the slice
  of a to be searched.
  */


  insort = function(a, x, lo, hi, cmp) {
    var mid;
    if (lo == null) {
      lo = 0;
    }
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (lo < 0) {
      throw new Error('lo must be non-negative');
    }
    if (hi == null) {
      hi = a.length;
    }
    while (lo < hi) {
      mid = floor((lo + hi) / 2);
      if (cmp(x, a[mid]) < 0) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    return ([].splice.apply(a, [lo, lo - lo].concat(x)), x);
  };

  /*
  Push item onto heap, maintaining the heap invariant.
  */


  heappush = function(array, item, cmp) {
    if (cmp == null) {
      cmp = defaultCmp;
    }
    array.push(item);
    return _siftdown(array, 0, array.length - 1, cmp);
  };

  /*
  Pop the smallest item off the heap, maintaining the heap invariant.
  */


  heappop = function(array, cmp) {
    var lastelt, returnitem;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    lastelt = array.pop();
    if (array.length) {
      returnitem = array[0];
      array[0] = lastelt;
      _siftup(array, 0, cmp);
    } else {
      returnitem = lastelt;
    }
    return returnitem;
  };

  /*
  Pop and return the current smallest value, and add the new item.
  
  This is more efficient than heappop() followed by heappush(), and can be 
  more appropriate when using a fixed size heap. Note that the value
  returned may be larger than item! That constrains reasonable use of
  this routine unless written as part of a conditional replacement:
      if item > array[0]
        item = heapreplace(array, item)
  */


  heapreplace = function(array, item, cmp) {
    var returnitem;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    returnitem = array[0];
    array[0] = item;
    _siftup(array, 0, cmp);
    return returnitem;
  };

  /*
  Fast version of a heappush followed by a heappop.
  */


  heappushpop = function(array, item, cmp) {
    var _ref;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (array.length && cmp(array[0], item) < 0) {
      _ref = [array[0], item], item = _ref[0], array[0] = _ref[1];
      _siftup(array, 0, cmp);
    }
    return item;
  };

  /*
  Transform list into a heap, in-place, in O(array.length) time.
  */


  heapify = function(array, cmp) {
    var i, _i, _j, _len, _ref, _ref1, _results, _results1;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    _ref1 = (function() {
      _results1 = [];
      for (var _j = 0, _ref = floor(array.length / 2); 0 <= _ref ? _j < _ref : _j > _ref; 0 <= _ref ? _j++ : _j--){ _results1.push(_j); }
      return _results1;
    }).apply(this).reverse();
    _results = [];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      i = _ref1[_i];
      _results.push(_siftup(array, i, cmp));
    }
    return _results;
  };

  /*
  Update the position of the given item in the heap.
  This function should be called every time the item is being modified.
  */


  updateItem = function(array, item, cmp) {
    var pos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    pos = array.indexOf(item);
    if (pos === -1) {
      return;
    }
    _siftdown(array, 0, pos, cmp);
    return _siftup(array, pos, cmp);
  };

  /*
  Find the n largest elements in a dataset.
  */


  nlargest = function(array, n, cmp) {
    var elem, result, _i, _len, _ref;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    result = array.slice(0, n);
    if (!result.length) {
      return result;
    }
    heapify(result, cmp);
    _ref = array.slice(n);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      elem = _ref[_i];
      heappushpop(result, elem, cmp);
    }
    return result.sort(cmp).reverse();
  };

  /*
  Find the n smallest elements in a dataset.
  */


  nsmallest = function(array, n, cmp) {
    var elem, i, los, result, _i, _j, _len, _ref, _ref1, _results;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (n * 10 <= array.length) {
      result = array.slice(0, n).sort(cmp);
      if (!result.length) {
        return result;
      }
      los = result[result.length - 1];
      _ref = array.slice(n);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
        if (cmp(elem, los) < 0) {
          insort(result, elem, 0, null, cmp);
          result.pop();
          los = result[result.length - 1];
        }
      }
      return result;
    }
    heapify(array, cmp);
    _results = [];
    for (i = _j = 0, _ref1 = min(n, array.length); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
      _results.push(heappop(array, cmp));
    }
    return _results;
  };

  _siftdown = function(array, startpos, pos, cmp) {
    var newitem, parent, parentpos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    newitem = array[pos];
    while (pos > startpos) {
      parentpos = (pos - 1) >> 1;
      parent = array[parentpos];
      if (cmp(newitem, parent) < 0) {
        array[pos] = parent;
        pos = parentpos;
        continue;
      }
      break;
    }
    return array[pos] = newitem;
  };

  _siftup = function(array, pos, cmp) {
    var childpos, endpos, newitem, rightpos, startpos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    endpos = array.length;
    startpos = pos;
    newitem = array[pos];
    childpos = 2 * pos + 1;
    while (childpos < endpos) {
      rightpos = childpos + 1;
      if (rightpos < endpos && !(cmp(array[childpos], array[rightpos]) < 0)) {
        childpos = rightpos;
      }
      array[pos] = array[childpos];
      pos = childpos;
      childpos = 2 * pos + 1;
    }
    array[pos] = newitem;
    return _siftdown(array, startpos, pos, cmp);
  };

  Heap = (function() {
    Heap.push = heappush;

    Heap.pop = heappop;

    Heap.replace = heapreplace;

    Heap.pushpop = heappushpop;

    Heap.heapify = heapify;

    Heap.nlargest = nlargest;

    Heap.nsmallest = nsmallest;

    function Heap(cmp) {
      this.cmp = cmp != null ? cmp : defaultCmp;
      this.nodes = [];
    }

    Heap.prototype.push = function(x) {
      return heappush(this.nodes, x, this.cmp);
    };

    Heap.prototype.pop = function() {
      return heappop(this.nodes, this.cmp);
    };

    Heap.prototype.peek = function() {
      return this.nodes[0];
    };

    Heap.prototype.contains = function(x) {
      return this.nodes.indexOf(x) !== -1;
    };

    Heap.prototype.replace = function(x) {
      return heapreplace(this.nodes, x, this.cmp);
    };

    Heap.prototype.pushpop = function(x) {
      return heappushpop(this.nodes, x, this.cmp);
    };

    Heap.prototype.heapify = function() {
      return heapify(this.nodes, this.cmp);
    };

    Heap.prototype.updateItem = function(x) {
      return updateItem(this.nodes, x, this.cmp);
    };

    Heap.prototype.clear = function() {
      return this.nodes = [];
    };

    Heap.prototype.empty = function() {
      return this.nodes.length === 0;
    };

    Heap.prototype.size = function() {
      return this.nodes.length;
    };

    Heap.prototype.clone = function() {
      var heap;
      heap = new Heap();
      heap.nodes = this.nodes.slice(0);
      return heap;
    };

    Heap.prototype.toArray = function() {
      return this.nodes.slice(0);
    };

    Heap.prototype.insert = Heap.prototype.push;

    Heap.prototype.remove = Heap.prototype.pop;

    Heap.prototype.top = Heap.prototype.peek;

    Heap.prototype.front = Heap.prototype.peek;

    Heap.prototype.has = Heap.prototype.contains;

    Heap.prototype.copy = Heap.prototype.clone;

    return Heap;

  })();

  if (typeof module !== "undefined" && module !== null ? module.exports : void 0) {
    module.exports = Heap;
  } else {
    window.Heap = Heap;
  }

}).call(this);

},{}],9:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/PathFinding";
module.exports = {
  'Heap': require('heap'),
  'Node': require('./core/Node'),
  'Grid': require('./core/Grid'),
  'Util': require('./core/Util'),
  'Heuristic': require('./core/Heuristic'),
  'AStarFinder': require('./finders/AStarFinder'),
  'BestFirstFinder': require('./finders/BestFirstFinder'),
  'BreadthFirstFinder': require('./finders/BreadthFirstFinder'),
  'DijkstraFinder': require('./finders/DijkstraFinder'),
  'BiAStarFinder': require('./finders/BiAStarFinder'),
  'BiBestFirstFinder': require('./finders/BiBestFirstFinder'),
  'BiBreadthFirstFinder': require('./finders/BiBreadthFirstFinder'),
  'BiDijkstraFinder': require('./finders/BiDijkstraFinder'),
  'JumpPointFinder': require('./finders/JumpPointFinder'),
  'IDAStarFinder': require('./finders/IDAStarFinder'),
  'OrthogonalJumpPointFinder': require('./finders/OrthogonalJumpPointFinder')
};


},{"./core/Grid":10,"./core/Heuristic":11,"./core/Node":12,"./core/Util":13,"./finders/AStarFinder":14,"./finders/BestFirstFinder":15,"./finders/BiAStarFinder":16,"./finders/BiBestFirstFinder":17,"./finders/BiBreadthFirstFinder":18,"./finders/BiDijkstraFinder":19,"./finders/BreadthFirstFinder":20,"./finders/DijkstraFinder":21,"./finders/IDAStarFinder":22,"./finders/JumpPointFinder":23,"./finders/OrthogonalJumpPointFinder":24,"heap":7}],10:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/core/Grid";
var Node = require('./Node');
function Grid(width, height, matrix) {
  this.width = width;
  this.height = height;
  this.nodes = this._buildNodes(width, height, matrix);
}
Grid.prototype._buildNodes = function(width, height, matrix) {
  var i,
      j,
      nodes = new Array(height),
      row;
  for (i = 0; i < height; ++i) {
    nodes[i] = new Array(width);
    for (j = 0; j < width; ++j) {
      nodes[i][j] = new Node(j, i);
    }
  }
  if (matrix === undefined) {
    return nodes;
  }
  if (matrix.length !== height || matrix[0].length !== width) {
    throw new Error('Matrix size does not fit');
  }
  for (i = 0; i < height; ++i) {
    for (j = 0; j < width; ++j) {
      if (matrix[i][j]) {
        nodes[i][j].walkable = false;
      }
    }
  }
  return nodes;
};
Grid.prototype.getNodeAt = function(x, y) {
  return this.nodes[y][x];
};
Grid.prototype.isWalkableAt = function(x, y) {
  return this.isInside(x, y) && this.nodes[y][x].walkable;
};
Grid.prototype.isInside = function(x, y) {
  return (x >= 0 && x < this.width) && (y >= 0 && y < this.height);
};
Grid.prototype.setWalkableAt = function(x, y, walkable) {
  this.nodes[y][x].walkable = walkable;
};
Grid.prototype.getNeighbors = function(node, allowDiagonal, dontCrossCorners) {
  var x = node.x,
      y = node.y,
      neighbors = [],
      s0 = false,
      d0 = false,
      s1 = false,
      d1 = false,
      s2 = false,
      d2 = false,
      s3 = false,
      d3 = false,
      nodes = this.nodes;
  if (this.isWalkableAt(x, y - 1)) {
    neighbors.push(nodes[y - 1][x]);
    s0 = true;
  }
  if (this.isWalkableAt(x + 1, y)) {
    neighbors.push(nodes[y][x + 1]);
    s1 = true;
  }
  if (this.isWalkableAt(x, y + 1)) {
    neighbors.push(nodes[y + 1][x]);
    s2 = true;
  }
  if (this.isWalkableAt(x - 1, y)) {
    neighbors.push(nodes[y][x - 1]);
    s3 = true;
  }
  if (!allowDiagonal) {
    return neighbors;
  }
  if (dontCrossCorners) {
    d0 = s3 && s0;
    d1 = s0 && s1;
    d2 = s1 && s2;
    d3 = s2 && s3;
  } else {
    d0 = s3 || s0;
    d1 = s0 || s1;
    d2 = s1 || s2;
    d3 = s2 || s3;
  }
  if (d0 && this.isWalkableAt(x - 1, y - 1)) {
    neighbors.push(nodes[y - 1][x - 1]);
  }
  if (d1 && this.isWalkableAt(x + 1, y - 1)) {
    neighbors.push(nodes[y - 1][x + 1]);
  }
  if (d2 && this.isWalkableAt(x + 1, y + 1)) {
    neighbors.push(nodes[y + 1][x + 1]);
  }
  if (d3 && this.isWalkableAt(x - 1, y + 1)) {
    neighbors.push(nodes[y + 1][x - 1]);
  }
  return neighbors;
};
Grid.prototype.clone = function() {
  var i,
      j,
      width = this.width,
      height = this.height,
      thisNodes = this.nodes,
      newGrid = new Grid(width, height),
      newNodes = new Array(height),
      row;
  for (i = 0; i < height; ++i) {
    newNodes[i] = new Array(width);
    for (j = 0; j < width; ++j) {
      newNodes[i][j] = new Node(j, i, thisNodes[i][j].walkable);
    }
  }
  newGrid.nodes = newNodes;
  return newGrid;
};
module.exports = Grid;


},{"./Node":12}],11:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/core/Heuristic";
module.exports = {
  manhattan: function(dx, dy) {
    return dx + dy;
  },
  euclidean: function(dx, dy) {
    return Math.sqrt(dx * dx + dy * dy);
  },
  chebyshev: function(dx, dy) {
    return Math.max(dx, dy);
  }
};


},{}],12:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/core/Node";
function Node(x, y, walkable) {
  this.x = x;
  this.y = y;
  this.walkable = (walkable === undefined ? true : walkable);
}
;
module.exports = Node;


},{}],13:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/core/Util";
function backtrace(node) {
  var path = [[node.x, node.y]];
  while (node.parent) {
    node = node.parent;
    path.push([node.x, node.y]);
  }
  return path.reverse();
}
exports.backtrace = backtrace;
function biBacktrace(nodeA, nodeB) {
  var pathA = backtrace(nodeA),
      pathB = backtrace(nodeB);
  return pathA.concat(pathB.reverse());
}
exports.biBacktrace = biBacktrace;
function pathLength(path) {
  var i,
      sum = 0,
      a,
      b,
      dx,
      dy;
  for (i = 1; i < path.length; ++i) {
    a = path[i - 1];
    b = path[i];
    dx = a[0] - b[0];
    dy = a[1] - b[1];
    sum += Math.sqrt(dx * dx + dy * dy);
  }
  return sum;
}
exports.pathLength = pathLength;
function interpolate(x0, y0, x1, y1) {
  var abs = Math.abs,
      line = [],
      sx,
      sy,
      dx,
      dy,
      err,
      e2;
  dx = abs(x1 - x0);
  dy = abs(y1 - y0);
  sx = (x0 < x1) ? 1 : -1;
  sy = (y0 < y1) ? 1 : -1;
  err = dx - dy;
  while (true) {
    line.push([x0, y0]);
    if (x0 === x1 && y0 === y1) {
      break;
    }
    e2 = 2 * err;
    if (e2 > -dy) {
      err = err - dy;
      x0 = x0 + sx;
    }
    if (e2 < dx) {
      err = err + dx;
      y0 = y0 + sy;
    }
  }
  return line;
}
exports.interpolate = interpolate;
function expandPath(path) {
  var expanded = [],
      len = path.length,
      coord0,
      coord1,
      interpolated,
      interpolatedLen,
      i,
      j;
  if (len < 2) {
    return expanded;
  }
  for (i = 0; i < len - 1; ++i) {
    coord0 = path[i];
    coord1 = path[i + 1];
    interpolated = interpolate(coord0[0], coord0[1], coord1[0], coord1[1]);
    interpolatedLen = interpolated.length;
    for (j = 0; j < interpolatedLen - 1; ++j) {
      expanded.push(interpolated[j]);
    }
  }
  expanded.push(path[len - 1]);
  return expanded;
}
exports.expandPath = expandPath;
function smoothenPath(grid, path) {
  var len = path.length,
      x0 = path[0][0],
      y0 = path[0][1],
      x1 = path[len - 1][0],
      y1 = path[len - 1][1],
      sx,
      sy,
      ex,
      ey,
      lx,
      ly,
      newPath,
      i,
      j,
      coord,
      line,
      testCoord,
      blocked;
  sx = x0;
  sy = y0;
  lx = path[1][0];
  ly = path[1][1];
  newPath = [[sx, sy]];
  for (i = 2; i < len; ++i) {
    coord = path[i];
    ex = coord[0];
    ey = coord[1];
    line = interpolate(sx, sy, ex, ey);
    blocked = false;
    for (j = 1; j < line.length; ++j) {
      testCoord = line[j];
      if (!grid.isWalkableAt(testCoord[0], testCoord[1])) {
        blocked = true;
        newPath.push([lx, ly]);
        sx = lx;
        sy = ly;
        break;
      }
    }
    if (!blocked) {
      lx = ex;
      ly = ey;
    }
  }
  newPath.push([x1, y1]);
  return newPath;
}
exports.smoothenPath = smoothenPath;
function compressPath(path) {
  if (path.length < 3) {
    return path;
  }
  var compressed = [],
      sx = path[0][0],
      sy = path[0][1],
      px = path[1][0],
      py = path[1][1],
      dx = px - sx,
      dy = py - sy,
      lx,
      ly,
      ldx,
      ldy,
      sq,
      i;
  sq = Math.sqrt(dx * dx + dy * dy);
  dx /= sq;
  dy /= sq;
  compressed.push([sx, sy]);
  for (i = 2; i < path.length; i++) {
    lx = px;
    ly = py;
    ldx = dx;
    ldy = dy;
    px = path[i][0];
    py = path[i][1];
    dx = px - lx;
    dy = py - ly;
    sq = Math.sqrt(dx * dx + dy * dy);
    dx /= sq;
    dy /= sq;
    if (dx !== ldx || dy !== ldy) {
      compressed.push([lx, ly]);
    }
  }
  compressed.push([px, py]);
  return compressed;
}
exports.compressPath = compressPath;


},{}],14:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/AStarFinder";
var Heap = require('heap');
var Util = require('../core/Util');
var Heuristic = require('../core/Heuristic');
function AStarFinder(opt) {
  opt = opt || {};
  this.allowDiagonal = opt.allowDiagonal;
  this.dontCrossCorners = opt.dontCrossCorners;
  this.heuristic = opt.heuristic || Heuristic.manhattan;
  this.weight = opt.weight || 1;
}
AStarFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
  var openList = new Heap(function(nodeA, nodeB) {
    return nodeA.f - nodeB.f;
  }),
      startNode = grid.getNodeAt(startX, startY),
      endNode = grid.getNodeAt(endX, endY),
      heuristic = this.heuristic,
      allowDiagonal = this.allowDiagonal,
      dontCrossCorners = this.dontCrossCorners,
      weight = this.weight,
      abs = Math.abs,
      SQRT2 = Math.SQRT2,
      node,
      neighbors,
      neighbor,
      i,
      l,
      x,
      y,
      ng;
  startNode.g = 0;
  startNode.f = 0;
  openList.push(startNode);
  startNode.opened = true;
  while (!openList.empty()) {
    node = openList.pop();
    node.closed = true;
    if (node === endNode) {
      return Util.backtrace(endNode);
    }
    neighbors = grid.getNeighbors(node, allowDiagonal, dontCrossCorners);
    for (i = 0, l = neighbors.length; i < l; ++i) {
      neighbor = neighbors[i];
      if (neighbor.closed) {
        continue;
      }
      x = neighbor.x;
      y = neighbor.y;
      ng = node.g + ((x - node.x === 0 || y - node.y === 0) ? 1 : SQRT2);
      if (!neighbor.opened || ng < neighbor.g) {
        neighbor.g = ng;
        neighbor.h = neighbor.h || weight * heuristic(abs(x - endX), abs(y - endY));
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = node;
        if (!neighbor.opened) {
          openList.push(neighbor);
          neighbor.opened = true;
        } else {
          openList.updateItem(neighbor);
        }
      }
    }
  }
  return [];
};
module.exports = AStarFinder;


},{"../core/Heuristic":11,"../core/Util":13,"heap":7}],15:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/BestFirstFinder";
var AStarFinder = require('./AStarFinder');
function BestFirstFinder(opt) {
  AStarFinder.call(this, opt);
  var orig = this.heuristic;
  this.heuristic = function(dx, dy) {
    return orig(dx, dy) * 1000000;
  };
}
;
BestFirstFinder.prototype = new AStarFinder();
BestFirstFinder.prototype.constructor = BestFirstFinder;
module.exports = BestFirstFinder;


},{"./AStarFinder":14}],16:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/BiAStarFinder";
var Heap = require('heap');
var Util = require('../core/Util');
var Heuristic = require('../core/Heuristic');
function BiAStarFinder(opt) {
  opt = opt || {};
  this.allowDiagonal = opt.allowDiagonal;
  this.dontCrossCorners = opt.dontCrossCorners;
  this.heuristic = opt.heuristic || Heuristic.manhattan;
  this.weight = opt.weight || 1;
}
BiAStarFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
  var cmp = function(nodeA, nodeB) {
    return nodeA.f - nodeB.f;
  },
      startOpenList = new Heap(cmp),
      endOpenList = new Heap(cmp),
      startNode = grid.getNodeAt(startX, startY),
      endNode = grid.getNodeAt(endX, endY),
      heuristic = this.heuristic,
      allowDiagonal = this.allowDiagonal,
      dontCrossCorners = this.dontCrossCorners,
      weight = this.weight,
      abs = Math.abs,
      SQRT2 = Math.SQRT2,
      node,
      neighbors,
      neighbor,
      i,
      l,
      x,
      y,
      ng,
      BY_START = 1,
      BY_END = 2;
  startNode.g = 0;
  startNode.f = 0;
  startOpenList.push(startNode);
  startNode.opened = BY_START;
  endNode.g = 0;
  endNode.f = 0;
  endOpenList.push(endNode);
  endNode.opened = BY_END;
  while (!startOpenList.empty() && !endOpenList.empty()) {
    node = startOpenList.pop();
    node.closed = true;
    neighbors = grid.getNeighbors(node, allowDiagonal, dontCrossCorners);
    for (i = 0, l = neighbors.length; i < l; ++i) {
      neighbor = neighbors[i];
      if (neighbor.closed) {
        continue;
      }
      if (neighbor.opened === BY_END) {
        return Util.biBacktrace(node, neighbor);
      }
      x = neighbor.x;
      y = neighbor.y;
      ng = node.g + ((x - node.x === 0 || y - node.y === 0) ? 1 : SQRT2);
      if (!neighbor.opened || ng < neighbor.g) {
        neighbor.g = ng;
        neighbor.h = neighbor.h || weight * heuristic(abs(x - endX), abs(y - endY));
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = node;
        if (!neighbor.opened) {
          startOpenList.push(neighbor);
          neighbor.opened = BY_START;
        } else {
          startOpenList.updateItem(neighbor);
        }
      }
    }
    node = endOpenList.pop();
    node.closed = true;
    neighbors = grid.getNeighbors(node, allowDiagonal, dontCrossCorners);
    for (i = 0, l = neighbors.length; i < l; ++i) {
      neighbor = neighbors[i];
      if (neighbor.closed) {
        continue;
      }
      if (neighbor.opened === BY_START) {
        return Util.biBacktrace(neighbor, node);
      }
      x = neighbor.x;
      y = neighbor.y;
      ng = node.g + ((x - node.x === 0 || y - node.y === 0) ? 1 : SQRT2);
      if (!neighbor.opened || ng < neighbor.g) {
        neighbor.g = ng;
        neighbor.h = neighbor.h || weight * heuristic(abs(x - startX), abs(y - startY));
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = node;
        if (!neighbor.opened) {
          endOpenList.push(neighbor);
          neighbor.opened = BY_END;
        } else {
          endOpenList.updateItem(neighbor);
        }
      }
    }
  }
  return [];
};
module.exports = BiAStarFinder;


},{"../core/Heuristic":11,"../core/Util":13,"heap":7}],17:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/BiBestFirstFinder";
var BiAStarFinder = require('./BiAStarFinder');
function BiBestFirstFinder(opt) {
  BiAStarFinder.call(this, opt);
  var orig = this.heuristic;
  this.heuristic = function(dx, dy) {
    return orig(dx, dy) * 1000000;
  };
}
BiBestFirstFinder.prototype = new BiAStarFinder();
BiBestFirstFinder.prototype.constructor = BiBestFirstFinder;
module.exports = BiBestFirstFinder;


},{"./BiAStarFinder":16}],18:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/BiBreadthFirstFinder";
var Util = require('../core/Util');
function BiBreadthFirstFinder(opt) {
  opt = opt || {};
  this.allowDiagonal = opt.allowDiagonal;
  this.dontCrossCorners = opt.dontCrossCorners;
}
BiBreadthFirstFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
  var startNode = grid.getNodeAt(startX, startY),
      endNode = grid.getNodeAt(endX, endY),
      startOpenList = [],
      endOpenList = [],
      neighbors,
      neighbor,
      node,
      allowDiagonal = this.allowDiagonal,
      dontCrossCorners = this.dontCrossCorners,
      BY_START = 0,
      BY_END = 1,
      i,
      l;
  startOpenList.push(startNode);
  startNode.opened = true;
  startNode.by = BY_START;
  endOpenList.push(endNode);
  endNode.opened = true;
  endNode.by = BY_END;
  while (startOpenList.length && endOpenList.length) {
    node = startOpenList.shift();
    node.closed = true;
    neighbors = grid.getNeighbors(node, allowDiagonal, dontCrossCorners);
    for (i = 0, l = neighbors.length; i < l; ++i) {
      neighbor = neighbors[i];
      if (neighbor.closed) {
        continue;
      }
      if (neighbor.opened) {
        if (neighbor.by === BY_END) {
          return Util.biBacktrace(node, neighbor);
        }
        continue;
      }
      startOpenList.push(neighbor);
      neighbor.parent = node;
      neighbor.opened = true;
      neighbor.by = BY_START;
    }
    node = endOpenList.shift();
    node.closed = true;
    neighbors = grid.getNeighbors(node, allowDiagonal, dontCrossCorners);
    for (i = 0, l = neighbors.length; i < l; ++i) {
      neighbor = neighbors[i];
      if (neighbor.closed) {
        continue;
      }
      if (neighbor.opened) {
        if (neighbor.by === BY_START) {
          return Util.biBacktrace(neighbor, node);
        }
        continue;
      }
      endOpenList.push(neighbor);
      neighbor.parent = node;
      neighbor.opened = true;
      neighbor.by = BY_END;
    }
  }
  return [];
};
module.exports = BiBreadthFirstFinder;


},{"../core/Util":13}],19:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/BiDijkstraFinder";
var BiAStarFinder = require('./BiAStarFinder');
function BiDijkstraFinder(opt) {
  BiAStarFinder.call(this, opt);
  this.heuristic = function(dx, dy) {
    return 0;
  };
}
BiDijkstraFinder.prototype = new BiAStarFinder();
BiDijkstraFinder.prototype.constructor = BiDijkstraFinder;
module.exports = BiDijkstraFinder;


},{"./BiAStarFinder":16}],20:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/BreadthFirstFinder";
var Util = require('../core/Util');
function BreadthFirstFinder(opt) {
  opt = opt || {};
  this.allowDiagonal = opt.allowDiagonal;
  this.dontCrossCorners = opt.dontCrossCorners;
}
BreadthFirstFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
  var openList = [],
      allowDiagonal = this.allowDiagonal,
      dontCrossCorners = this.dontCrossCorners,
      startNode = grid.getNodeAt(startX, startY),
      endNode = grid.getNodeAt(endX, endY),
      neighbors,
      neighbor,
      node,
      i,
      l;
  openList.push(startNode);
  startNode.opened = true;
  while (openList.length) {
    node = openList.shift();
    node.closed = true;
    if (node === endNode) {
      return Util.backtrace(endNode);
    }
    neighbors = grid.getNeighbors(node, allowDiagonal, dontCrossCorners);
    for (i = 0, l = neighbors.length; i < l; ++i) {
      neighbor = neighbors[i];
      if (neighbor.closed || neighbor.opened) {
        continue;
      }
      openList.push(neighbor);
      neighbor.opened = true;
      neighbor.parent = node;
    }
  }
  return [];
};
module.exports = BreadthFirstFinder;


},{"../core/Util":13}],21:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/DijkstraFinder";
var AStarFinder = require('./AStarFinder');
function DijkstraFinder(opt) {
  AStarFinder.call(this, opt);
  this.heuristic = function(dx, dy) {
    return 0;
  };
}
DijkstraFinder.prototype = new AStarFinder();
DijkstraFinder.prototype.constructor = DijkstraFinder;
module.exports = DijkstraFinder;


},{"./AStarFinder":14}],22:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/IDAStarFinder";
var Util = require('../core/Util');
var Heuristic = require('../core/Heuristic');
var Node = require('../core/Node');
function IDAStarFinder(opt) {
  opt = opt || {};
  this.allowDiagonal = opt.allowDiagonal;
  this.dontCrossCorners = opt.dontCrossCorners;
  this.heuristic = opt.heuristic || Heuristic.manhattan;
  this.weight = opt.weight || 1;
  this.trackRecursion = opt.trackRecursion || false;
  this.timeLimit = opt.timeLimit || Infinity;
}
IDAStarFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
  var nodesVisited = 0;
  var startTime = new Date().getTime();
  var h = function(a, b) {
    return this.heuristic(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  }.bind(this);
  var cost = function(a, b) {
    return (a.x === b.x || a.y === b.y) ? 1 : Math.SQRT2;
  };
  var search = function(node, g, cutoff, route, depth) {
    nodesVisited++;
    if (this.timeLimit > 0 && new Date().getTime() - startTime > this.timeLimit * 1000) {
      return Infinity;
    }
    var f = g + h(node, end) * this.weight;
    if (f > cutoff) {
      return f;
    }
    if (node == end) {
      route[depth] = [node.x, node.y];
      return node;
    }
    var min,
        t,
        k,
        neighbour;
    var neighbours = grid.getNeighbors(node, this.allowDiagonal, this.dontCrossCorners);
    for (k = 0, min = Infinity; neighbour = neighbours[k]; ++k) {
      if (this.trackRecursion) {
        neighbour.retainCount = neighbour.retainCount + 1 || 1;
        if (neighbour.tested !== true) {
          neighbour.tested = true;
        }
      }
      t = search(neighbour, g + cost(node, neighbour), cutoff, route, depth + 1);
      if (t instanceof Node) {
        route[depth] = [node.x, node.y];
        return t;
      }
      if (this.trackRecursion && (--neighbour.retainCount) === 0) {
        neighbour.tested = false;
      }
      if (t < min) {
        min = t;
      }
    }
    return min;
  }.bind(this);
  var start = grid.getNodeAt(startX, startY);
  var end = grid.getNodeAt(endX, endY);
  var cutOff = h(start, end);
  var j,
      route,
      t;
  for (j = 0; true; ++j) {
    route = [];
    t = search(start, 0, cutOff, route, 0);
    if (t === Infinity) {
      return [];
    }
    if (t instanceof Node) {
      return route;
    }
    cutOff = t;
  }
  return [];
};
module.exports = IDAStarFinder;


},{"../core/Heuristic":11,"../core/Node":12,"../core/Util":13}],23:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/JumpPointFinder";
var Heap = require('heap');
var Util = require('../core/Util');
var Heuristic = require('../core/Heuristic');
function JumpPointFinder(opt) {
  opt = opt || {};
  this.heuristic = opt.heuristic || Heuristic.manhattan;
  this.trackJumpRecursion = opt.trackJumpRecursion || false;
}
JumpPointFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
  var openList = this.openList = new Heap(function(nodeA, nodeB) {
    return nodeA.f - nodeB.f;
  }),
      startNode = this.startNode = grid.getNodeAt(startX, startY),
      endNode = this.endNode = grid.getNodeAt(endX, endY),
      node;
  this.grid = grid;
  startNode.g = 0;
  startNode.f = 0;
  openList.push(startNode);
  startNode.opened = true;
  while (!openList.empty()) {
    node = openList.pop();
    node.closed = true;
    if (node === endNode) {
      return Util.expandPath(Util.backtrace(endNode));
    }
    this._identifySuccessors(node);
  }
  return [];
};
JumpPointFinder.prototype._identifySuccessors = function(node) {
  var grid = this.grid,
      heuristic = this.heuristic,
      openList = this.openList,
      endX = this.endNode.x,
      endY = this.endNode.y,
      neighbors,
      neighbor,
      jumpPoint,
      i,
      l,
      x = node.x,
      y = node.y,
      jx,
      jy,
      dx,
      dy,
      d,
      ng,
      jumpNode,
      abs = Math.abs,
      max = Math.max;
  neighbors = this._findNeighbors(node);
  for (i = 0, l = neighbors.length; i < l; ++i) {
    neighbor = neighbors[i];
    jumpPoint = this._jump(neighbor[0], neighbor[1], x, y);
    if (jumpPoint) {
      jx = jumpPoint[0];
      jy = jumpPoint[1];
      jumpNode = grid.getNodeAt(jx, jy);
      if (jumpNode.closed) {
        continue;
      }
      d = Heuristic.euclidean(abs(jx - x), abs(jy - y));
      ng = node.g + d;
      if (!jumpNode.opened || ng < jumpNode.g) {
        jumpNode.g = ng;
        jumpNode.h = jumpNode.h || heuristic(abs(jx - endX), abs(jy - endY));
        jumpNode.f = jumpNode.g + jumpNode.h;
        jumpNode.parent = node;
        if (!jumpNode.opened) {
          openList.push(jumpNode);
          jumpNode.opened = true;
        } else {
          openList.updateItem(jumpNode);
        }
      }
    }
  }
};
JumpPointFinder.prototype._jump = function(x, y, px, py) {
  var grid = this.grid,
      dx = x - px,
      dy = y - py,
      jx,
      jy;
  if (!grid.isWalkableAt(x, y)) {
    return null;
  }
  if (this.trackJumpRecursion === true) {
    grid.getNodeAt(x, y).tested = true;
  }
  if (grid.getNodeAt(x, y) === this.endNode) {
    return [x, y];
  }
  if (dx !== 0 && dy !== 0) {
    if ((grid.isWalkableAt(x - dx, y + dy) && !grid.isWalkableAt(x - dx, y)) || (grid.isWalkableAt(x + dx, y - dy) && !grid.isWalkableAt(x, y - dy))) {
      return [x, y];
    }
  } else {
    if (dx !== 0) {
      if ((grid.isWalkableAt(x + dx, y + 1) && !grid.isWalkableAt(x, y + 1)) || (grid.isWalkableAt(x + dx, y - 1) && !grid.isWalkableAt(x, y - 1))) {
        return [x, y];
      }
    } else {
      if ((grid.isWalkableAt(x + 1, y + dy) && !grid.isWalkableAt(x + 1, y)) || (grid.isWalkableAt(x - 1, y + dy) && !grid.isWalkableAt(x - 1, y))) {
        return [x, y];
      }
    }
  }
  if (dx !== 0 && dy !== 0) {
    jx = this._jump(x + dx, y, x, y);
    jy = this._jump(x, y + dy, x, y);
    if (jx || jy) {
      return [x, y];
    }
  }
  if (grid.isWalkableAt(x + dx, y) || grid.isWalkableAt(x, y + dy)) {
    return this._jump(x + dx, y + dy, x, y);
  } else {
    return null;
  }
};
JumpPointFinder.prototype._findNeighbors = function(node) {
  var parent = node.parent,
      x = node.x,
      y = node.y,
      grid = this.grid,
      px,
      py,
      nx,
      ny,
      dx,
      dy,
      neighbors = [],
      neighborNodes,
      neighborNode,
      i,
      l;
  if (parent) {
    px = parent.x;
    py = parent.y;
    dx = (x - px) / Math.max(Math.abs(x - px), 1);
    dy = (y - py) / Math.max(Math.abs(y - py), 1);
    if (dx !== 0 && dy !== 0) {
      if (grid.isWalkableAt(x, y + dy)) {
        neighbors.push([x, y + dy]);
      }
      if (grid.isWalkableAt(x + dx, y)) {
        neighbors.push([x + dx, y]);
      }
      if (grid.isWalkableAt(x, y + dy) || grid.isWalkableAt(x + dx, y)) {
        neighbors.push([x + dx, y + dy]);
      }
      if (!grid.isWalkableAt(x - dx, y) && grid.isWalkableAt(x, y + dy)) {
        neighbors.push([x - dx, y + dy]);
      }
      if (!grid.isWalkableAt(x, y - dy) && grid.isWalkableAt(x + dx, y)) {
        neighbors.push([x + dx, y - dy]);
      }
    } else {
      if (dx === 0) {
        if (grid.isWalkableAt(x, y + dy)) {
          neighbors.push([x, y + dy]);
          if (!grid.isWalkableAt(x + 1, y)) {
            neighbors.push([x + 1, y + dy]);
          }
          if (!grid.isWalkableAt(x - 1, y)) {
            neighbors.push([x - 1, y + dy]);
          }
        }
      } else {
        if (grid.isWalkableAt(x + dx, y)) {
          neighbors.push([x + dx, y]);
          if (!grid.isWalkableAt(x, y + 1)) {
            neighbors.push([x + dx, y + 1]);
          }
          if (!grid.isWalkableAt(x, y - 1)) {
            neighbors.push([x + dx, y - 1]);
          }
        }
      }
    }
  } else {
    neighborNodes = grid.getNeighbors(node, true);
    for (i = 0, l = neighborNodes.length; i < l; ++i) {
      neighborNode = neighborNodes[i];
      neighbors.push([neighborNode.x, neighborNode.y]);
    }
  }
  return neighbors;
};
module.exports = JumpPointFinder;


},{"../core/Heuristic":11,"../core/Util":13,"heap":7}],24:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/pathfinding/src/finders/OrthogonalJumpPointFinder";
var Heuristic = require('../core/Heuristic');
var JumpPointFinder = require('./JumpPointFinder');
function OrthogonalJumpPointFinder(opt) {
  JumpPointFinder.call(this, opt);
  opt = opt || {};
  this.heuristic = opt.heuristic || Heuristic.manhattan;
}
OrthogonalJumpPointFinder.prototype = new JumpPointFinder();
OrthogonalJumpPointFinder.prototype.constructor = OrthogonalJumpPointFinder;
OrthogonalJumpPointFinder.prototype._jump = function(x, y, px, py) {
  var grid = this.grid,
      dx = x - px,
      dy = y - py,
      jxRight,
      jxLeft;
  if (!grid.isWalkableAt(x, y)) {
    return null;
  }
  if (this.trackJumpRecursion === true) {
    grid.getNodeAt(x, y).tested = true;
  }
  if (grid.getNodeAt(x, y) === this.endNode) {
    return [x, y];
  }
  if (dx !== 0) {
    if ((grid.isWalkableAt(x, y - 1) && !grid.isWalkableAt(x - dx, y - 1)) || (grid.isWalkableAt(x, y + 1) && !grid.isWalkableAt(x - dx, y + 1))) {
      return [x, y];
    }
  } else if (dy !== 0) {
    if ((grid.isWalkableAt(x - 1, y) && !grid.isWalkableAt(x - 1, y - dy)) || (grid.isWalkableAt(x + 1, y) && !grid.isWalkableAt(x + 1, y - dy))) {
      return [x, y];
    }
    jxRight = this._jump(x + 1, y, x, y);
    jxLeft = this._jump(x - 1, y, x, y);
    if (jxRight || jxLeft) {
      return [x, y];
    }
  } else {
    throw new Error("Only horizontal and vertical movements are allowed");
  }
  return this._jump(x + dx, y + dy, x, y);
};
OrthogonalJumpPointFinder.prototype._findNeighbors = function(node) {
  var parent = node.parent,
      x = node.x,
      y = node.y,
      grid = this.grid,
      px,
      py,
      nx,
      ny,
      dx,
      dy,
      neighbors = [],
      neighborNodes,
      neighborNode,
      i,
      l;
  if (parent) {
    px = parent.x;
    py = parent.y;
    dx = (x - px) / Math.max(Math.abs(x - px), 1);
    dy = (y - py) / Math.max(Math.abs(y - py), 1);
    if (dx !== 0) {
      if (grid.isWalkableAt(x, y - 1)) {
        neighbors.push([x, y - 1]);
      }
      if (grid.isWalkableAt(x, y + 1)) {
        neighbors.push([x, y + 1]);
      }
      if (grid.isWalkableAt(x + dx, y)) {
        neighbors.push([x + dx, y]);
      }
    } else if (dy !== 0) {
      if (grid.isWalkableAt(x - 1, y)) {
        neighbors.push([x - 1, y]);
      }
      if (grid.isWalkableAt(x + 1, y)) {
        neighbors.push([x + 1, y]);
      }
      if (grid.isWalkableAt(x, y + dy)) {
        neighbors.push([x, y + dy]);
      }
    }
  } else {
    neighborNodes = grid.getNeighbors(node, false);
    for (i = 0, l = neighborNodes.length; i < l; ++i) {
      neighborNode = neighborNodes[i];
      neighbors.push([neighborNode.x, neighborNode.y]);
    }
  }
  return neighbors;
};
module.exports = OrthogonalJumpPointFinder;


},{"../core/Heuristic":11,"./JumpPointFinder":23}],25:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/socket.io-client/index";
module.exports = require('./lib/');


},{"./lib/":26}],26:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/socket.io-client/lib/index";
var url = require('./url');
var parser = require('socket.io-parser');
var Manager = require('./manager');
var debug = require('debug')('socket.io-client');
module.exports = exports = lookup;
var cache = exports.managers = {};
function lookup(uri, opts) {
  if (typeof uri == 'object') {
    opts = uri;
    uri = undefined;
  }
  opts = opts || {};
  var parsed = url(uri);
  var source = parsed.source;
  var id = parsed.id;
  var io;
  if (opts.forceNew || false === opts.multiplex) {
    debug('ignoring socket cache for %s', source);
    io = Manager(source, opts);
  } else {
    if (!cache[id]) {
      debug('new io instance for %s', source);
      cache[id] = Manager(source, opts);
    }
    io = cache[id];
  }
  return io.socket(parsed.path);
}
exports.protocol = parser.protocol;
exports.connect = lookup;
exports.Manager = require('./manager');
exports.Socket = require('./socket');


},{"./manager":27,"./socket":29,"./url":30,"debug":32,"socket.io-parser":63}],27:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/socket.io-client/lib/manager";
var url = require('./url');
var eio = require('engine.io-client');
var Socket = require('./socket');
var Emitter = require('emitter');
var parser = require('socket.io-parser');
var on = require('./on');
var bind = require('bind');
var object = require('object-component');
var debug = require('debug')('socket.io-client:manager');
module.exports = Manager;
function Manager(uri, opts) {
  if (!(this instanceof Manager))
    return new Manager(uri, opts);
  if ('object' == typeof uri) {
    opts = uri;
    uri = undefined;
  }
  opts = opts || {};
  opts.path = opts.path || '/socket.io';
  this.nsps = {};
  this.subs = [];
  this.opts = opts;
  this.reconnection(opts.reconnection !== false);
  this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
  this.reconnectionDelay(opts.reconnectionDelay || 1000);
  this.reconnectionDelayMax(opts.reconnectionDelayMax || 5000);
  this.timeout(null == opts.timeout ? 20000 : opts.timeout);
  this.readyState = 'closed';
  this.uri = uri;
  this.connected = 0;
  this.attempts = 0;
  this.encoding = false;
  this.packetBuffer = [];
  this.encoder = new parser.Encoder();
  this.decoder = new parser.Decoder();
  this.open();
}
Emitter(Manager.prototype);
Manager.prototype.reconnection = function(v) {
  if (!arguments.length)
    return this._reconnection;
  this._reconnection = !!v;
  return this;
};
Manager.prototype.reconnectionAttempts = function(v) {
  if (!arguments.length)
    return this._reconnectionAttempts;
  this._reconnectionAttempts = v;
  return this;
};
Manager.prototype.reconnectionDelay = function(v) {
  if (!arguments.length)
    return this._reconnectionDelay;
  this._reconnectionDelay = v;
  return this;
};
Manager.prototype.reconnectionDelayMax = function(v) {
  if (!arguments.length)
    return this._reconnectionDelayMax;
  this._reconnectionDelayMax = v;
  return this;
};
Manager.prototype.timeout = function(v) {
  if (!arguments.length)
    return this._timeout;
  this._timeout = v;
  return this;
};
Manager.prototype.maybeReconnectOnOpen = function() {
  if (!this.openReconnect && !this.reconnecting && this._reconnection) {
    this.openReconnect = true;
    this.reconnect();
  }
};
Manager.prototype.open = Manager.prototype.connect = function(fn) {
  debug('readyState %s', this.readyState);
  if (~this.readyState.indexOf('open'))
    return this;
  debug('opening %s', this.uri);
  this.engine = eio(this.uri, this.opts);
  var socket = this.engine;
  var self = this;
  this.readyState = 'opening';
  var openSub = on(socket, 'open', function() {
    self.onopen();
    fn && fn();
  });
  var errorSub = on(socket, 'error', function(data) {
    debug('connect_error');
    self.cleanup();
    self.readyState = 'closed';
    self.emit('connect_error', data);
    if (fn) {
      var err = new Error('Connection error');
      err.data = data;
      fn(err);
    }
    self.maybeReconnectOnOpen();
  });
  if (false !== this._timeout) {
    var timeout = this._timeout;
    debug('connect attempt will timeout after %d', timeout);
    var timer = setTimeout(function() {
      debug('connect attempt timed out after %d', timeout);
      openSub.destroy();
      socket.close();
      socket.emit('error', 'timeout');
      self.emit('connect_timeout', timeout);
    }, timeout);
    this.subs.push({destroy: function() {
        clearTimeout(timer);
      }});
  }
  this.subs.push(openSub);
  this.subs.push(errorSub);
  return this;
};
Manager.prototype.onopen = function() {
  debug('open');
  this.cleanup();
  this.readyState = 'open';
  this.emit('open');
  var socket = this.engine;
  this.subs.push(on(socket, 'data', bind(this, 'ondata')));
  this.subs.push(on(this.decoder, 'decoded', bind(this, 'ondecoded')));
  this.subs.push(on(socket, 'error', bind(this, 'onerror')));
  this.subs.push(on(socket, 'close', bind(this, 'onclose')));
};
Manager.prototype.ondata = function(data) {
  this.decoder.add(data);
};
Manager.prototype.ondecoded = function(packet) {
  this.emit('packet', packet);
};
Manager.prototype.onerror = function(err) {
  debug('error', err);
  this.emit('error', err);
};
Manager.prototype.socket = function(nsp) {
  var socket = this.nsps[nsp];
  if (!socket) {
    socket = new Socket(this, nsp);
    this.nsps[nsp] = socket;
    var self = this;
    socket.on('connect', function() {
      self.connected++;
    });
  }
  return socket;
};
Manager.prototype.destroy = function(socket) {
  --this.connected || this.close();
};
Manager.prototype.packet = function(packet) {
  debug('writing packet %j', packet);
  var self = this;
  if (!self.encoding) {
    self.encoding = true;
    this.encoder.encode(packet, function(encodedPackets) {
      for (var i = 0; i < encodedPackets.length; i++) {
        self.engine.write(encodedPackets[i]);
      }
      self.encoding = false;
      self.processPacketQueue();
    });
  } else {
    self.packetBuffer.push(packet);
  }
};
Manager.prototype.processPacketQueue = function() {
  if (this.packetBuffer.length > 0 && !this.encoding) {
    var pack = this.packetBuffer.shift();
    this.packet(pack);
  }
};
Manager.prototype.cleanup = function() {
  var sub;
  while (sub = this.subs.shift())
    sub.destroy();
  this.packetBuffer = [];
  this.encoding = false;
  this.decoder.destroy();
};
Manager.prototype.close = Manager.prototype.disconnect = function() {
  this.skipReconnect = true;
  this.engine.close();
};
Manager.prototype.onclose = function(reason) {
  debug('close');
  this.cleanup();
  this.readyState = 'closed';
  this.emit('close', reason);
  if (this._reconnection && !this.skipReconnect) {
    this.reconnect();
  }
};
Manager.prototype.reconnect = function() {
  if (this.reconnecting)
    return this;
  var self = this;
  this.attempts++;
  if (this.attempts > this._reconnectionAttempts) {
    debug('reconnect failed');
    this.emit('reconnect_failed');
    this.reconnecting = false;
  } else {
    var delay = this.attempts * this.reconnectionDelay();
    delay = Math.min(delay, this.reconnectionDelayMax());
    debug('will wait %dms before reconnect attempt', delay);
    this.reconnecting = true;
    var timer = setTimeout(function() {
      debug('attempting reconnect');
      self.emit('reconnect_attempt');
      self.open(function(err) {
        if (err) {
          debug('reconnect attempt error');
          self.reconnecting = false;
          self.reconnect();
          self.emit('reconnect_error', err.data);
        } else {
          debug('reconnect success');
          self.onreconnect();
        }
      });
    }, delay);
    this.subs.push({destroy: function() {
        clearTimeout(timer);
      }});
  }
};
Manager.prototype.onreconnect = function() {
  var attempt = this.attempts;
  this.attempts = 0;
  this.reconnecting = false;
  this.emit('reconnect', attempt);
};


},{"./on":28,"./socket":29,"./url":30,"bind":31,"debug":32,"emitter":33,"engine.io-client":34,"object-component":60,"socket.io-parser":63}],28:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/socket.io-client/lib/on";
module.exports = on;
function on(obj, ev, fn) {
  obj.on(ev, fn);
  return {destroy: function() {
      obj.removeListener(ev, fn);
    }};
}


},{}],29:[function(require,module,exports){
"use strict";
var __moduleName = "node_modules/socket.io-client/lib/socket";
var parser = require('socket.io-parser');
var Emitter = require('emitter');
var toArray = require('to-array');
var on = require('./on');
var bind = require('bind');
var debug = require('debug')('socket.io-client:socket');
var hasBin = require('has-binary-data');
var indexOf = require('indexof');
module.exports = exports = Socket;
var events = {
  connect: 1,
  disconnect: 1,
  error: 1
};
var emit = Emitter.prototype.emit;
function Socket(io, nsp) {
  this.io = io;
  this.nsp = nsp;
  this.json = this;
  this.ids = 0;
  this.acks = {};
  this.open();
  this.buffer = [];
  this.connected = false;
  this.disconnected = true;
}
Emitter(Socket.prototype);
Socket.prototype.open = Socket.prototype.connect = function() {
  if (this.connected)
    return this;
  var io = this.io;
  io.open();
  this.subs = [on(io, 'open', bind(this, 'onopen')), on(io, 'error', bind(this, 'onerror')), on(io, 'packet', bind(this, 'onpacket')), on(io, 'close', bind(this, 'onclose'))];
  if ('open' == this.io.readyState)
    this.onopen();
  return this;
};
Socket.prototype.send = function() {
  var args = toArray(arguments);
  args.unshift('message');
  this.emit.apply(this, args);
  return this;
};
Socket.prototype.emit = function(ev) {
  if (events.hasOwnProperty(ev)) {
    emit.apply(this, arguments);
    return this;
  }
  var args = toArray(arguments);
  var parserType = parser.EVENT;
  if (hasBin(args)) {
    parserType = parser.BINARY_EVENT;
  }
  var packet = {
    type: parserType,
    data: args
  };
  if ('function' == typeof args[args.length - 1]) {
    debug('emitting packet with ack id %d', this.ids);
    this.acks[this.ids] = args.pop();
    packet.id = this.ids++;
  }
  this.packet(packet);
  return this;
};
Socket.prototype.packet = function(packet) {
  packet.nsp = this.nsp;
  this.io.packet(packet);
};
Socket.prototype.onerror = function(data) {
  this.emit('error', data);
};
Socket.prototype.onopen = function() {
  debug('transport is open - connecting');
  if ('/' != this.nsp) {
    this.packet({type: parser.CONNECT});
  }
};
Socket.prototype.onclose = function(reason) {
  debug('close (%s)', reason);
  this.connected = false;
  this.disconnected = true;
  this.emit('disconnect', reason);
};
Socket.prototype.onpacket = function(packet) {
  if (packet.nsp != this.nsp)
    return;
  switch (packet.type) {
    case parser.CONNECT:
      this.onconnect();
      break;
    case parser.EVENT:
      this.onevent(packet);
      break;
    case parser.BINARY_EVENT:
      this.onevent(packet);
      break;
    case parser.ACK:
      this.onack(packet);
      break;
    case parser.DISCONNECT:
      this.ondisconnect();
      break;
    case parser.ERROR:
      this.emit('error', packet.data);
      break;
  }
};
Socket.prototype.onevent = function(packet) {
  var args = packet.data || [];
  debug('emitting event %j', args);
  if (null != packet.id) {
    debug('attaching ack callback to event');
    args.push(this.ack(packet.id));
  }
  if (this.connected) {
    emit.apply(this, args);
  } else {
    this.buffer.push(args);
  }
};
Socket.prototype.ack = function(id) {
  var self = this;
  var sent = false;
  return function() {
    if (sent)
      return;
    sent = true;
    var args = toArray(arguments);
    debug('sending ack %j', args);
    self.packet({
      type: parser.ACK,
      id: id,
      data: args
    });
  };
};
Socket.prototype.onack = function(packet) {
  debug('calling ack %s with %j', packet.id, packet.data);
  var fn = this.acks[packet.id];
  fn.apply(this, packet.data);
  delete this.acks[packet.id];
};
Socket.prototype.onconnect = function() {
  this.connected = true;
  this.disconnected = false;
  this.emit('connect');
  this.emitBuffered();
};
Socket.prototype.emitBuffered = function() {
  for (var i = 0; i < this.buffer.length; i++) {
    emit.apply(this, this.buffer[i]);
  }
  this.buffer = [];
};
Socket.prototype.ondisconnect = function() {
  debug('server disconnect (%s)', this.nsp);
  this.destroy();
  this.onclose('io server disconnect');
};
Socket.prototype.destroy = function() {
  for (var i = 0; i < this.subs.length; i++) {
    this.subs[i].destroy();
  }
  this.io.destroy(this);
};
Socket.prototype.close = Socket.prototype.disconnect = function() {
  if (!this.connected)
    return this;
  debug('performing disconnect (%s)', this.nsp);
  this.packet({type: parser.DISCONNECT});
  this.destroy();
  this.onclose('io client disconnect');
  return this;
};


},{"./on":28,"bind":31,"debug":32,"emitter":33,"has-binary-data":57,"indexof":59,"socket.io-parser":63,"to-array":66}],30:[function(require,module,exports){
(function (global){
"use strict";
var __moduleName = "node_modules/socket.io-client/lib/url";
var parseuri = require('parseuri');
var debug = require('debug')('socket.io-client:url');
module.exports = url;
function url(uri, loc) {
  var obj = uri;
  var loc = loc || global.location;
  if (null == uri)
    uri = loc.protocol + '//' + loc.hostname;
  if ('string' == typeof uri) {
    if ('/' == uri.charAt(0)) {
      if ('undefined' != typeof loc) {
        uri = loc.hostname + uri;
      }
    }
    if (!/^(https?|wss?):\/\//.test(uri)) {
      debug('protocol-less url %s', uri);
      if ('undefined' != typeof loc) {
        uri = loc.protocol + '//' + uri;
      } else {
        uri = 'https://' + uri;
      }
    }
    debug('parse %s', uri);
    obj = parseuri(uri);
  }
  if ((/(http|ws)/.test(obj.protocol) && 80 == obj.port) || (/(http|ws)s/.test(obj.protocol) && 443 == obj.port)) {
    delete obj.port;
  }
  obj.path = obj.path || '/';
  obj.id = obj.protocol + obj.host + (obj.port ? (':' + obj.port) : '');
  obj.href = obj.protocol + '://' + obj.host + (obj.port ? (':' + obj.port) : '');
  return obj;
}


}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"debug":32,"parseuri":61}],31:[function(require,module,exports){

/**
 * Slice reference.
 */

var slice = [].slice;

/**
 * Bind `obj` to `fn`.
 *
 * @param {Object} obj
 * @param {Function|String} fn or string
 * @return {Function}
 * @api public
 */

module.exports = function(obj, fn){
  if ('string' == typeof fn) fn = obj[fn];
  if ('function' != typeof fn) throw new Error('bind() requires a function');
  var args = [].slice.call(arguments, 2);
  return function(){
    return fn.apply(obj, args.concat(slice.call(arguments)));
  }
};

},{}],32:[function(require,module,exports){

/**
 * Expose `debug()` as the module.
 */

module.exports = debug;

/**
 * Create a debugger with the given `name`.
 *
 * @param {String} name
 * @return {Type}
 * @api public
 */

function debug(name) {
  if (!debug.enabled(name)) return function(){};

  return function(fmt){
    fmt = coerce(fmt);

    var curr = new Date;
    var ms = curr - (debug[name] || curr);
    debug[name] = curr;

    fmt = name
      + ' '
      + fmt
      + ' +' + debug.humanize(ms);

    // This hackery is required for IE8
    // where `console.log` doesn't have 'apply'
    window.console
      && console.log
      && Function.prototype.apply.call(console.log, console, arguments);
  }
}

/**
 * The currently active debug mode names.
 */

debug.names = [];
debug.skips = [];

/**
 * Enables a debug mode by name. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} name
 * @api public
 */

debug.enable = function(name) {
  try {
    localStorage.debug = name;
  } catch(e){}

  var split = (name || '').split(/[\s,]+/)
    , len = split.length;

  for (var i = 0; i < len; i++) {
    name = split[i].replace('*', '.*?');
    if (name[0] === '-') {
      debug.skips.push(new RegExp('^' + name.substr(1) + '$'));
    }
    else {
      debug.names.push(new RegExp('^' + name + '$'));
    }
  }
};

/**
 * Disable debug output.
 *
 * @api public
 */

debug.disable = function(){
  debug.enable('');
};

/**
 * Humanize the given `ms`.
 *
 * @param {Number} m
 * @return {String}
 * @api private
 */

debug.humanize = function(ms) {
  var sec = 1000
    , min = 60 * 1000
    , hour = 60 * min;

  if (ms >= hour) return (ms / hour).toFixed(1) + 'h';
  if (ms >= min) return (ms / min).toFixed(1) + 'm';
  if (ms >= sec) return (ms / sec | 0) + 's';
  return ms + 'ms';
};

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

debug.enabled = function(name) {
  for (var i = 0, len = debug.skips.length; i < len; i++) {
    if (debug.skips[i].test(name)) {
      return false;
    }
  }
  for (var i = 0, len = debug.names.length; i < len; i++) {
    if (debug.names[i].test(name)) {
      return true;
    }
  }
  return false;
};

/**
 * Coerce `val`.
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

// persist

try {
  if (window.localStorage) debug.enable(localStorage.debug);
} catch(e){}

},{}],33:[function(require,module,exports){

/**
 * Module dependencies.
 */

var index = require('indexof');

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  fn._off = on;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var i = index(callbacks, fn._off || fn);
  if (~i) callbacks.splice(i, 1);
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{"indexof":59}],34:[function(require,module,exports){

module.exports =  require('./lib/');

},{"./lib/":35}],35:[function(require,module,exports){

module.exports = require('./socket');

/**
 * Exports parser
 *
 * @api public
 *
 */
module.exports.parser = require('engine.io-parser');

},{"./socket":36,"engine.io-parser":44}],36:[function(require,module,exports){
(function (global){
/**
 * Module dependencies.
 */

var transports = require('./transports');
var Emitter = require('emitter');
var debug = require('debug')('engine.io-client:socket');
var index = require('indexof');
var parser = require('engine.io-parser');
var parseuri = require('parseuri');
var parsejson = require('parsejson');
var parseqs = require('parseqs');

/**
 * Module exports.
 */

module.exports = Socket;

/**
 * Noop function.
 *
 * @api private
 */

function noop(){}

/**
 * Socket constructor.
 *
 * @param {String|Object} uri or options
 * @param {Object} options
 * @api public
 */

function Socket(uri, opts){
  if (!(this instanceof Socket)) return new Socket(uri, opts);

  opts = opts || {};

  if (uri && 'object' == typeof uri) {
    opts = uri;
    uri = null;
  }

  if (uri) {
    uri = parseuri(uri);
    opts.host = uri.host;
    opts.secure = uri.protocol == 'https' || uri.protocol == 'wss';
    opts.port = uri.port;
    if (uri.query) opts.query = uri.query;
  }

  this.secure = null != opts.secure ? opts.secure :
    (global.location && 'https:' == location.protocol);

  if (opts.host) {
    var pieces = opts.host.split(':');
    opts.hostname = pieces.shift();
    if (pieces.length) opts.port = pieces.pop();
  }

  this.agent = opts.agent || false;
  this.hostname = opts.hostname ||
    (global.location ? location.hostname : 'localhost');
  this.port = opts.port || (global.location && location.port ?
       location.port :
       (this.secure ? 443 : 80));
  this.query = opts.query || {};
  if ('string' == typeof this.query) this.query = parseqs.decode(this.query);
  this.upgrade = false !== opts.upgrade;
  this.path = (opts.path || '/engine.io').replace(/\/$/, '') + '/';
  this.forceJSONP = !!opts.forceJSONP;
  this.forceBase64 = !!opts.forceBase64;
  this.timestampParam = opts.timestampParam || 't';
  this.timestampRequests = opts.timestampRequests;
  this.transports = opts.transports || ['polling', 'websocket'];
  this.readyState = '';
  this.writeBuffer = [];
  this.callbackBuffer = [];
  this.policyPort = opts.policyPort || 843;
  this.rememberUpgrade = opts.rememberUpgrade || false;
  this.open();
  this.binaryType = null;
  this.onlyBinaryUpgrades = opts.onlyBinaryUpgrades;
}

Socket.priorWebsocketSuccess = false;

/**
 * Mix in `Emitter`.
 */

Emitter(Socket.prototype);

/**
 * Protocol version.
 *
 * @api public
 */

Socket.protocol = parser.protocol; // this is an int

/**
 * Expose deps for legacy compatibility
 * and standalone browser access.
 */

Socket.Socket = Socket;
Socket.Transport = require('./transport');
Socket.transports = require('./transports');
Socket.parser = require('engine.io-parser');

/**
 * Creates transport of the given type.
 *
 * @param {String} transport name
 * @return {Transport}
 * @api private
 */

Socket.prototype.createTransport = function (name) {
  debug('creating transport "%s"', name);
  var query = clone(this.query);

  // append engine.io protocol identifier
  query.EIO = parser.protocol;

  // transport name
  query.transport = name;

  // session id if we already have one
  if (this.id) query.sid = this.id;

  var transport = new transports[name]({
    agent: this.agent,
    hostname: this.hostname,
    port: this.port,
    secure: this.secure,
    path: this.path,
    query: query,
    forceJSONP: this.forceJSONP,
    forceBase64: this.forceBase64,
    timestampRequests: this.timestampRequests,
    timestampParam: this.timestampParam,
    policyPort: this.policyPort,
    socket: this
  });

  return transport;
};

function clone (obj) {
  var o = {};
  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      o[i] = obj[i];
    }
  }
  return o;
}

/**
 * Initializes transport to use and starts probe.
 *
 * @api private
 */
Socket.prototype.open = function () {
  var transport;
  if (this.rememberUpgrade && Socket.priorWebsocketSuccess && this.transports.indexOf('websocket') != -1) {
    transport = 'websocket';
  } else {
    transport = this.transports[0];
  }
  this.readyState = 'opening';
  var transport = this.createTransport(transport);
  transport.open();
  this.setTransport(transport);
};

/**
 * Sets the current transport. Disables the existing one (if any).
 *
 * @api private
 */

Socket.prototype.setTransport = function(transport){
  debug('setting transport %s', transport.name);
  var self = this;

  if (this.transport) {
    debug('clearing existing transport %s', this.transport.name);
    this.transport.removeAllListeners();
  }

  // set up transport
  this.transport = transport;

  // set up transport listeners
  transport
  .on('drain', function(){
    self.onDrain();
  })
  .on('packet', function(packet){
    self.onPacket(packet);
  })
  .on('error', function(e){
    self.onError(e);
  })
  .on('close', function(){
    self.onClose('transport close');
  });
};

/**
 * Probes a transport.
 *
 * @param {String} transport name
 * @api private
 */

Socket.prototype.probe = function (name) {
  debug('probing transport "%s"', name);
  var transport = this.createTransport(name, { probe: 1 })
    , failed = false
    , self = this;

  Socket.priorWebsocketSuccess = false;

  function onTransportOpen(){
    if (self.onlyBinaryUpgrades) {
      var upgradeLosesBinary = !this.supportsBinary && self.transport.supportsBinary;
      failed = failed || upgradeLosesBinary;
    }
    if (failed) return;

    debug('probe transport "%s" opened', name);
    transport.send([{ type: 'ping', data: 'probe' }]);
    transport.once('packet', function (msg) {
      if (failed) return;
      if ('pong' == msg.type && 'probe' == msg.data) {
        debug('probe transport "%s" pong', name);
        self.upgrading = true;
        self.emit('upgrading', transport);
        Socket.priorWebsocketSuccess = 'websocket' == transport.name;

        debug('pausing current transport "%s"', self.transport.name);
        self.transport.pause(function () {
          if (failed) return;
          if ('closed' == self.readyState || 'closing' == self.readyState) {
            return;
          }
          debug('changing transport and sending upgrade packet');

          cleanup();

          self.setTransport(transport);
          transport.send([{ type: 'upgrade' }]);
          self.emit('upgrade', transport);
          transport = null;
          self.upgrading = false;
          self.flush();
        });
      } else {
        debug('probe transport "%s" failed', name);
        var err = new Error('probe error');
        err.transport = transport.name;
        self.emit('upgradeError', err);
      }
    });
  }

  function freezeTransport() {
    if (failed) return;

    // Any callback called by transport should be ignored since now
    failed = true;

    cleanup();

    transport.close();
    transport = null;
  }

  //Handle any error that happens while probing
  function onerror(err) {
    var error = new Error('probe error: ' + err);
    error.transport = transport.name;

    freezeTransport();

    debug('probe transport "%s" failed because of error: %s', name, err);

    self.emit('upgradeError', error);
  }

  function onTransportClose(){
    onerror("transport closed");
  }

  //When the socket is closed while we're probing
  function onclose(){
    onerror("socket closed");
  }

  //When the socket is upgraded while we're probing
  function onupgrade(to){
    if (transport && to.name != transport.name) {
      debug('"%s" works - aborting "%s"', to.name, transport.name);
      freezeTransport();
    }
  }

  //Remove all listeners on the transport and on self
  function cleanup(){
    transport.removeListener('open', onTransportOpen);
    transport.removeListener('error', onerror);
    transport.removeListener('close', onTransportClose);
    self.removeListener('close', onclose);
    self.removeListener('upgrading', onupgrade);
  }

  transport.once('open', onTransportOpen);
  transport.once('error', onerror);
  transport.once('close', onTransportClose);

  this.once('close', onclose);
  this.once('upgrading', onupgrade);

  transport.open();

};

/**
 * Called when connection is deemed open.
 *
 * @api public
 */

Socket.prototype.onOpen = function () {
  debug('socket open');
  this.readyState = 'open';
  Socket.priorWebsocketSuccess = 'websocket' == this.transport.name;
  this.emit('open');
  this.flush();

  // we check for `readyState` in case an `open`
  // listener already closed the socket
  if ('open' == this.readyState && this.upgrade && this.transport.pause) {
    debug('starting upgrade probes');
    for (var i = 0, l = this.upgrades.length; i < l; i++) {
      this.probe(this.upgrades[i]);
    }
  }
};

/**
 * Handles a packet.
 *
 * @api private
 */

Socket.prototype.onPacket = function (packet) {
  if ('opening' == this.readyState || 'open' == this.readyState) {
    debug('socket receive: type "%s", data "%s"', packet.type, packet.data);

    this.emit('packet', packet);

    // Socket is live - any packet counts
    this.emit('heartbeat');

    switch (packet.type) {
      case 'open':
        this.onHandshake(parsejson(packet.data));
        break;

      case 'pong':
        this.setPing();
        break;

      case 'error':
        var err = new Error('server error');
        err.code = packet.data;
        this.emit('error', err);
        break;

      case 'message':
        this.emit('data', packet.data);
        this.emit('message', packet.data);
        break;
    }
  } else {
    debug('packet received with socket readyState "%s"', this.readyState);
  }
};

/**
 * Called upon handshake completion.
 *
 * @param {Object} handshake obj
 * @api private
 */

Socket.prototype.onHandshake = function (data) {
  this.emit('handshake', data);
  this.id = data.sid;
  this.transport.query.sid = data.sid;
  this.upgrades = this.filterUpgrades(data.upgrades);
  this.pingInterval = data.pingInterval;
  this.pingTimeout = data.pingTimeout;
  this.onOpen();
  // In case open handler closes socket
  if  ('closed' == this.readyState) return;
  this.setPing();

  // Prolong liveness of socket on heartbeat
  this.removeListener('heartbeat', this.onHeartbeat);
  this.on('heartbeat', this.onHeartbeat);
};

/**
 * Resets ping timeout.
 *
 * @api private
 */

Socket.prototype.onHeartbeat = function (timeout) {
  clearTimeout(this.pingTimeoutTimer);
  var self = this;
  self.pingTimeoutTimer = setTimeout(function () {
    if ('closed' == self.readyState) return;
    self.onClose('ping timeout');
  }, timeout || (self.pingInterval + self.pingTimeout));
};

/**
 * Pings server every `this.pingInterval` and expects response
 * within `this.pingTimeout` or closes connection.
 *
 * @api private
 */

Socket.prototype.setPing = function () {
  var self = this;
  clearTimeout(self.pingIntervalTimer);
  self.pingIntervalTimer = setTimeout(function () {
    debug('writing ping packet - expecting pong within %sms', self.pingTimeout);
    self.ping();
    self.onHeartbeat(self.pingTimeout);
  }, self.pingInterval);
};

/**
* Sends a ping packet.
*
* @api public
*/

Socket.prototype.ping = function () {
  this.sendPacket('ping');
};

/**
 * Called on `drain` event
 *
 * @api private
 */

Socket.prototype.onDrain = function() {
  for (var i = 0; i < this.prevBufferLen; i++) {
    if (this.callbackBuffer[i]) {
      this.callbackBuffer[i]();
    }
  }

  this.writeBuffer.splice(0, this.prevBufferLen);
  this.callbackBuffer.splice(0, this.prevBufferLen);

  // setting prevBufferLen = 0 is very important
  // for example, when upgrading, upgrade packet is sent over,
  // and a nonzero prevBufferLen could cause problems on `drain`
  this.prevBufferLen = 0;

  if (this.writeBuffer.length == 0) {
    this.emit('drain');
  } else {
    this.flush();
  }
};

/**
 * Flush write buffers.
 *
 * @api private
 */

Socket.prototype.flush = function () {
  if ('closed' != this.readyState && this.transport.writable &&
    !this.upgrading && this.writeBuffer.length) {
    debug('flushing %d packets in socket', this.writeBuffer.length);
    this.transport.send(this.writeBuffer);
    // keep track of current length of writeBuffer
    // splice writeBuffer and callbackBuffer on `drain`
    this.prevBufferLen = this.writeBuffer.length;
    this.emit('flush');
  }
};

/**
 * Sends a message.
 *
 * @param {String} message.
 * @param {Function} callback function.
 * @return {Socket} for chaining.
 * @api public
 */

Socket.prototype.write =
Socket.prototype.send = function (msg, fn) {
  this.sendPacket('message', msg, fn);
  return this;
};

/**
 * Sends a packet.
 *
 * @param {String} packet type.
 * @param {String} data.
 * @param {Function} callback function.
 * @api private
 */

Socket.prototype.sendPacket = function (type, data, fn) {
  var packet = { type: type, data: data };
  this.emit('packetCreate', packet);
  this.writeBuffer.push(packet);
  this.callbackBuffer.push(fn);
  this.flush();
};

/**
 * Closes the connection.
 *
 * @api private
 */

Socket.prototype.close = function () {
  if ('opening' == this.readyState || 'open' == this.readyState) {
    this.onClose('forced close');
    debug('socket closing - telling transport to close');
    this.transport.close();
  }

  return this;
};

/**
 * Called upon transport error
 *
 * @api private
 */

Socket.prototype.onError = function (err) {
  debug('socket error %j', err);
  Socket.priorWebsocketSuccess = false;
  this.emit('error', err);
  this.onClose('transport error', err);
};

/**
 * Called upon transport close.
 *
 * @api private
 */

Socket.prototype.onClose = function (reason, desc) {
  if ('opening' == this.readyState || 'open' == this.readyState) {
    debug('socket close with reason: "%s"', reason);
    var self = this;

    // clear timers
    clearTimeout(this.pingIntervalTimer);
    clearTimeout(this.pingTimeoutTimer);

    // clean buffers in next tick, so developers can still
    // grab the buffers on `close` event
    setTimeout(function() {
      self.writeBuffer = [];
      self.callbackBuffer = [];
      self.prevBufferLen = 0;
    }, 0);

    // stop event from firing again for transport
    this.transport.removeAllListeners('close');

    // ensure transport won't stay open
    this.transport.close();

    // ignore further transport communication
    this.transport.removeAllListeners();

    // set ready state
    this.readyState = 'closed';

    // clear session id
    this.id = null;

    // emit close event
    this.emit('close', reason, desc);
  }
};

/**
 * Filters upgrades, returning only those matching client transports.
 *
 * @param {Array} server upgrades
 * @api private
 *
 */

Socket.prototype.filterUpgrades = function (upgrades) {
  var filteredUpgrades = [];
  for (var i = 0, j = upgrades.length; i<j; i++) {
    if (~index(this.transports, upgrades[i])) filteredUpgrades.push(upgrades[i]);
  }
  return filteredUpgrades;
};

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./transport":37,"./transports":38,"debug":32,"emitter":33,"engine.io-parser":44,"indexof":59,"parsejson":54,"parseqs":55,"parseuri":61}],37:[function(require,module,exports){
/**
 * Module dependencies.
 */

var parser = require('engine.io-parser');
var Emitter = require('emitter');

/**
 * Module exports.
 */

module.exports = Transport;

/**
 * Transport abstract constructor.
 *
 * @param {Object} options.
 * @api private
 */

function Transport (opts) {
  this.path = opts.path;
  this.hostname = opts.hostname;
  this.port = opts.port;
  this.secure = opts.secure;
  this.query = opts.query;
  this.timestampParam = opts.timestampParam;
  this.timestampRequests = opts.timestampRequests;
  this.readyState = '';
  this.agent = opts.agent || false;
  this.socket = opts.socket;
}

/**
 * Mix in `Emitter`.
 */

Emitter(Transport.prototype);

/**
 * A counter used to prevent collisions in the timestamps used
 * for cache busting.
 */

Transport.timestamps = 0;

/**
 * Emits an error.
 *
 * @param {String} str
 * @return {Transport} for chaining
 * @api public
 */

Transport.prototype.onError = function (msg, desc) {
  var err = new Error(msg);
  err.type = 'TransportError';
  err.description = desc;
  this.emit('error', err);
  return this;
};

/**
 * Opens the transport.
 *
 * @api public
 */

Transport.prototype.open = function () {
  if ('closed' == this.readyState || '' == this.readyState) {
    this.readyState = 'opening';
    this.doOpen();
  }

  return this;
};

/**
 * Closes the transport.
 *
 * @api private
 */

Transport.prototype.close = function () {
  if ('opening' == this.readyState || 'open' == this.readyState) {
    this.doClose();
    this.onClose();
  }

  return this;
};

/**
 * Sends multiple packets.
 *
 * @param {Array} packets
 * @api private
 */

Transport.prototype.send = function(packets){
  if ('open' == this.readyState) {
    this.write(packets);
  } else {
    throw new Error('Transport not open');
  }
};

/**
 * Called upon open
 *
 * @api private
 */

Transport.prototype.onOpen = function () {
  this.readyState = 'open';
  this.writable = true;
  this.emit('open');
};

/**
 * Called with data.
 *
 * @param {String} data
 * @api private
 */

Transport.prototype.onData = function (data) {
  this.onPacket(parser.decodePacket(data, this.socket.binaryType));
};

/**
 * Called with a decoded packet.
 */

Transport.prototype.onPacket = function (packet) {
  this.emit('packet', packet);
};

/**
 * Called upon close.
 *
 * @api private
 */

Transport.prototype.onClose = function () {
  this.readyState = 'closed';
  this.emit('close');
};

},{"emitter":33,"engine.io-parser":44}],38:[function(require,module,exports){
(function (global){
/**
 * Module dependencies
 */

var XMLHttpRequest = require('xmlhttprequest');
var XHR = require('./polling-xhr');
var JSONP = require('./polling-jsonp');
var websocket = require('./websocket');

/**
 * Export transports.
 */

exports.polling = polling;
exports.websocket = websocket;

/**
 * Polling transport polymorphic constructor.
 * Decides on xhr vs jsonp based on feature detection.
 *
 * @api private
 */

function polling(opts){
  var xhr;
  var xd = false;

  if (global.location) {
    var isSSL = 'https:' == location.protocol;
    var port = location.port;

    // some user agents have empty `location.port`
    if (!port) {
      port = isSSL ? 443 : 80;
    }

    xd = opts.hostname != location.hostname || port != opts.port;
  }

  opts.xdomain = xd;
  xhr = new XMLHttpRequest(opts);

  if ('open' in xhr && !opts.forceJSONP) {
    return new XHR(opts);
  } else {
    return new JSONP(opts);
  }
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./polling-jsonp":39,"./polling-xhr":40,"./websocket":42,"xmlhttprequest":43}],39:[function(require,module,exports){
(function (global){

/**
 * Module requirements.
 */

var Polling = require('./polling');
var inherit = require('inherits');

/**
 * Module exports.
 */

module.exports = JSONPPolling;

/**
 * Cached regular expressions.
 */

var rNewline = /\n/g;
var rEscapedNewline = /\\n/g;

/**
 * Global JSONP callbacks.
 */

var callbacks;

/**
 * Callbacks count.
 */

var index = 0;

/**
 * Noop.
 */

function empty () { }

/**
 * JSONP Polling constructor.
 *
 * @param {Object} opts.
 * @api public
 */

function JSONPPolling (opts) {
  Polling.call(this, opts);

  this.query = this.query || {};

  // define global callbacks array if not present
  // we do this here (lazily) to avoid unneeded global pollution
  if (!callbacks) {
    // we need to consider multiple engines in the same page
    if (!global.___eio) global.___eio = [];
    callbacks = global.___eio;
  }

  // callback identifier
  this.index = callbacks.length;

  // add callback to jsonp global
  var self = this;
  callbacks.push(function (msg) {
    self.onData(msg);
  });

  // append to query string
  this.query.j = this.index;

  // prevent spurious errors from being emitted when the window is unloaded
  if (global.document && global.addEventListener) {
    global.addEventListener('beforeunload', function () {
      if (self.script) self.script.onerror = empty;
    });
  }
}

/**
 * Inherits from Polling.
 */

inherit(JSONPPolling, Polling);

/*
 * JSONP only supports binary as base64 encoded strings
 */

JSONPPolling.prototype.supportsBinary = false;

/**
 * Closes the socket.
 *
 * @api private
 */

JSONPPolling.prototype.doClose = function () {
  if (this.script) {
    this.script.parentNode.removeChild(this.script);
    this.script = null;
  }

  if (this.form) {
    this.form.parentNode.removeChild(this.form);
    this.form = null;
  }

  Polling.prototype.doClose.call(this);
};

/**
 * Starts a poll cycle.
 *
 * @api private
 */

JSONPPolling.prototype.doPoll = function () {
  var self = this;
  var script = document.createElement('script');

  if (this.script) {
    this.script.parentNode.removeChild(this.script);
    this.script = null;
  }

  script.async = true;
  script.src = this.uri();
  script.onerror = function(e){
    self.onError('jsonp poll error',e);
  };

  var insertAt = document.getElementsByTagName('script')[0];
  insertAt.parentNode.insertBefore(script, insertAt);
  this.script = script;

  var isUAgecko = 'undefined' != typeof navigator && /gecko/i.test(navigator.userAgent);
  
  if (isUAgecko) {
    setTimeout(function () {
      var iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      document.body.removeChild(iframe);
    }, 100);
  }
};

/**
 * Writes with a hidden iframe.
 *
 * @param {String} data to send
 * @param {Function} called upon flush.
 * @api private
 */

JSONPPolling.prototype.doWrite = function (data, fn) {
  var self = this;

  if (!this.form) {
    var form = document.createElement('form');
    var area = document.createElement('textarea');
    var id = this.iframeId = 'eio_iframe_' + this.index;
    var iframe;

    form.className = 'socketio';
    form.style.position = 'absolute';
    form.style.top = '-1000px';
    form.style.left = '-1000px';
    form.target = id;
    form.method = 'POST';
    form.setAttribute('accept-charset', 'utf-8');
    area.name = 'd';
    form.appendChild(area);
    document.body.appendChild(form);

    this.form = form;
    this.area = area;
  }

  this.form.action = this.uri();

  function complete () {
    initIframe();
    fn();
  }

  function initIframe () {
    if (self.iframe) {
      try {
        self.form.removeChild(self.iframe);
      } catch (e) {
        self.onError('jsonp polling iframe removal error', e);
      }
    }

    try {
      // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
      var html = '<iframe src="javascript:0" name="'+ self.iframeId +'">';
      iframe = document.createElement(html);
    } catch (e) {
      iframe = document.createElement('iframe');
      iframe.name = self.iframeId;
      iframe.src = 'javascript:0';
    }

    iframe.id = self.iframeId;

    self.form.appendChild(iframe);
    self.iframe = iframe;
  }

  initIframe();

  // escape \n to prevent it from being converted into \r\n by some UAs
  // double escaping is required for escaped new lines because unescaping of new lines can be done safely on server-side
  data = data.replace(rEscapedNewline, '\\\n');
  this.area.value = data.replace(rNewline, '\\n');

  try {
    this.form.submit();
  } catch(e) {}

  if (this.iframe.attachEvent) {
    this.iframe.onreadystatechange = function(){
      if (self.iframe.readyState == 'complete') {
        complete();
      }
    };
  } else {
    this.iframe.onload = complete;
  }
};

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./polling":41,"inherits":53}],40:[function(require,module,exports){
(function (global){
/**
 * Module requirements.
 */

var XMLHttpRequest = require('xmlhttprequest');
var Polling = require('./polling');
var Emitter = require('emitter');
var debug = require('debug')('engine.io-client:polling-xhr');
var inherit = require('inherits');

/**
 * Module exports.
 */

module.exports = XHR;
module.exports.Request = Request;

/**
 * Empty function
 */

function empty(){}

/**
 * XHR Polling constructor.
 *
 * @param {Object} opts
 * @api public
 */

function XHR(opts){
  Polling.call(this, opts);

  if (global.location) {
    var isSSL = 'https:' == location.protocol;
    var port = location.port;

    // some user agents have empty `location.port`
    if (!port) {
      port = isSSL ? 443 : 80;
    }

    this.xd = opts.hostname != global.location.hostname ||
      port != opts.port;
  }
}

/**
 * Inherits from Polling.
 */

inherit(XHR, Polling);

/**
 * XHR supports binary
 */

XHR.prototype.supportsBinary = true;

/**
 * Creates a request.
 *
 * @param {String} method
 * @api private
 */

XHR.prototype.request = function(opts){
  opts = opts || {};
  opts.uri = this.uri();
  opts.xd = this.xd;
  opts.agent = this.agent || false;
  opts.supportsBinary = this.supportsBinary;
  return new Request(opts);
};

/**
 * Sends data.
 *
 * @param {String} data to send.
 * @param {Function} called upon flush.
 * @api private
 */

XHR.prototype.doWrite = function(data, fn){
  var isBinary = typeof data !== 'string' && data !== undefined;
  var req = this.request({ method: 'POST', data: data, isBinary: isBinary });
  var self = this;
  req.on('success', fn);
  req.on('error', function(err){
    self.onError('xhr post error', err);
  });
  this.sendXhr = req;
};

/**
 * Starts a poll cycle.
 *
 * @api private
 */

XHR.prototype.doPoll = function(){
  debug('xhr poll');
  var req = this.request();
  var self = this;
  req.on('data', function(data){
    self.onData(data);
  });
  req.on('error', function(err){
    self.onError('xhr poll error', err);
  });
  this.pollXhr = req;
};

/**
 * Request constructor
 *
 * @param {Object} options
 * @api public
 */

function Request(opts){
  this.method = opts.method || 'GET';
  this.uri = opts.uri;
  this.xd = !!opts.xd;
  this.async = false !== opts.async;
  this.data = undefined != opts.data ? opts.data : null;
  this.agent = opts.agent;
  this.create(opts.isBinary, opts.supportsBinary);
}

/**
 * Mix in `Emitter`.
 */

Emitter(Request.prototype);

/**
 * Creates the XHR object and sends the request.
 *
 * @api private
 */

Request.prototype.create = function(isBinary, supportsBinary){
  var xhr = this.xhr = new XMLHttpRequest({ agent: this.agent, xdomain: this.xd });
  var self = this;

  try {
    debug('xhr open %s: %s', this.method, this.uri);
    xhr.open(this.method, this.uri, this.async);
    if (supportsBinary) {
      // This has to be done after open because Firefox is stupid
      // http://stackoverflow.com/questions/13216903/get-binary-data-with-xmlhttprequest-in-a-firefox-extension
      xhr.responseType = 'arraybuffer';
    }

    if ('POST' == this.method) {
      try {
        if (isBinary) {
          xhr.setRequestHeader('Content-type', 'application/octet-stream');
        } else {
          xhr.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
        }
      } catch (e) {}
    }

    // ie6 check
    if ('withCredentials' in xhr) {
      xhr.withCredentials = true;
    }

    xhr.onreadystatechange = function(){
      var data;

      try {
        if (4 != xhr.readyState) return;
        if (200 == xhr.status || 1223 == xhr.status) {
          var contentType = xhr.getResponseHeader('Content-Type');
          if (contentType === 'application/octet-stream') {
            data = xhr.response;
          } else {
            if (!supportsBinary) {
              data = xhr.responseText;
            } else {
              data = 'ok';
            }
          }
        } else {
          // make sure the `error` event handler that's user-set
          // does not throw in the same tick and gets caught here
          setTimeout(function(){
            self.onError(xhr.status);
          }, 0);
        }
      } catch (e) {
        self.onError(e);
      }

      if (null != data) {
        self.onData(data);
      }
    };

    debug('xhr data %s', this.data);
    xhr.send(this.data);
  } catch (e) {
    // Need to defer since .create() is called directly fhrom the constructor
    // and thus the 'error' event can only be only bound *after* this exception
    // occurs.  Therefore, also, we cannot throw here at all.
    setTimeout(function() {
      self.onError(e);
    }, 0);
    return;
  }

  if (global.document) {
    this.index = Request.requestsCount++;
    Request.requests[this.index] = this;
  }
};

/**
 * Called upon successful response.
 *
 * @api private
 */

Request.prototype.onSuccess = function(){
  this.emit('success');
  this.cleanup();
};

/**
 * Called if we have data.
 *
 * @api private
 */

Request.prototype.onData = function(data){
  this.emit('data', data);
  this.onSuccess();
};

/**
 * Called upon error.
 *
 * @api private
 */

Request.prototype.onError = function(err){
  this.emit('error', err);
  this.cleanup();
};

/**
 * Cleans up house.
 *
 * @api private
 */

Request.prototype.cleanup = function(){
  if ('undefined' == typeof this.xhr || null === this.xhr) {
    return;
  }
  // xmlhttprequest
  this.xhr.onreadystatechange = empty;

  try {
    this.xhr.abort();
  } catch(e) {}

  if (global.document) {
    delete Request.requests[this.index];
  }

  this.xhr = null;
};

/**
 * Aborts the request.
 *
 * @api public
 */

Request.prototype.abort = function(){
  this.cleanup();
};

/**
 * Aborts pending requests when unloading the window. This is needed to prevent
 * memory leaks (e.g. when using IE) and to ensure that no spurious error is
 * emitted.
 */

if (global.document) {
  Request.requestsCount = 0;
  Request.requests = {};
  if (global.attachEvent) {
    global.attachEvent('onunload', unloadHandler);
  } else if (global.addEventListener) {
    global.addEventListener('beforeunload', unloadHandler);
  }
}

function unloadHandler() {
  for (var i in Request.requests) {
    if (Request.requests.hasOwnProperty(i)) {
      Request.requests[i].abort();
    }
  }
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./polling":41,"debug":32,"emitter":33,"inherits":53,"xmlhttprequest":43}],41:[function(require,module,exports){
/**
 * Module dependencies.
 */

var Transport = require('../transport');
var parseqs = require('parseqs');
var parser = require('engine.io-parser');
var debug = require('debug')('engine.io-client:polling');
var inherit = require('inherits');

/**
 * Module exports.
 */

module.exports = Polling;

/**
 * Is XHR2 supported?
 */

var hasXHR2 = (function() {
  var XMLHttpRequest = require('xmlhttprequest');
  var xhr = new XMLHttpRequest({ agent: this.agent, xdomain: false });
  return null != xhr.responseType;
})();

/**
 * Polling interface.
 *
 * @param {Object} opts
 * @api private
 */

function Polling(opts){
  var forceBase64 = (opts && opts.forceBase64);
  if (!hasXHR2 || forceBase64) {
    this.supportsBinary = false;
  }
  Transport.call(this, opts);
}

/**
 * Inherits from Transport.
 */

inherit(Polling, Transport);

/**
 * Transport name.
 */

Polling.prototype.name = 'polling';

/**
 * Opens the socket (triggers polling). We write a PING message to determine
 * when the transport is open.
 *
 * @api private
 */

Polling.prototype.doOpen = function(){
  this.poll();
};

/**
 * Pauses polling.
 *
 * @param {Function} callback upon buffers are flushed and transport is paused
 * @api private
 */

Polling.prototype.pause = function(onPause){
  var pending = 0;
  var self = this;

  this.readyState = 'pausing';

  function pause(){
    debug('paused');
    self.readyState = 'paused';
    onPause();
  }

  if (this.polling || !this.writable) {
    var total = 0;

    if (this.polling) {
      debug('we are currently polling - waiting to pause');
      total++;
      this.once('pollComplete', function(){
        debug('pre-pause polling complete');
        --total || pause();
      });
    }

    if (!this.writable) {
      debug('we are currently writing - waiting to pause');
      total++;
      this.once('drain', function(){
        debug('pre-pause writing complete');
        --total || pause();
      });
    }
  } else {
    pause();
  }
};

/**
 * Starts polling cycle.
 *
 * @api public
 */

Polling.prototype.poll = function(){
  debug('polling');
  this.polling = true;
  this.doPoll();
  this.emit('poll');
};

/**
 * Overloads onData to detect payloads.
 *
 * @api private
 */

Polling.prototype.onData = function(data){
  var self = this;
  debug('polling got data %s', data);
  var callback = function(packet, index, total) {
    // if its the first message we consider the transport open
    if ('opening' == self.readyState) {
      self.onOpen();
    }

    // if its a close packet, we close the ongoing requests
    if ('close' == packet.type) {
      self.onClose();
      return false;
    }

    // otherwise bypass onData and handle the message
    self.onPacket(packet);
  };

  // decode payload
  parser.decodePayload(data, this.socket.binaryType, callback);

  // if an event did not trigger closing
  if ('closed' != this.readyState) {
    // if we got data we're not polling
    this.polling = false;
    this.emit('pollComplete');

    if ('open' == this.readyState) {
      this.poll();
    } else {
      debug('ignoring poll - transport state "%s"', this.readyState);
    }
  }
};

/**
 * For polling, send a close packet.
 *
 * @api private
 */

Polling.prototype.doClose = function(){
  var self = this;

  function close(){
    debug('writing close packet');
    self.write([{ type: 'close' }]);
  }

  if ('open' == this.readyState) {
    debug('transport open - closing');
    close();
  } else {
    // in case we're trying to close while
    // handshaking is in progress (GH-164)
    debug('transport not open - deferring close');
    this.once('open', close);
  }
};

/**
 * Writes a packets payload.
 *
 * @param {Array} data packets
 * @param {Function} drain callback
 * @api private
 */

Polling.prototype.write = function(packets){
  var self = this;
  this.writable = false;
  var callbackfn = function() {
    self.writable = true;
    self.emit('drain');
  };

  var self = this;
  parser.encodePayload(packets, this.supportsBinary, function(data) {
    self.doWrite(data, callbackfn);
  });
};

/**
 * Generates uri for connection.
 *
 * @api private
 */

Polling.prototype.uri = function(){
  var query = this.query || {};
  var schema = this.secure ? 'https' : 'http';
  var port = '';

  // cache busting is forced
  if (false !== this.timestampRequests) {
    query[this.timestampParam] = +new Date + '-' + Transport.timestamps++;
  }

  if (!this.supportsBinary && !query.sid) {
    query.b64 = 1;
  }

  query = parseqs.encode(query);

  // avoid port if default for schema
  if (this.port && (('https' == schema && this.port != 443) ||
     ('http' == schema && this.port != 80))) {
    port = ':' + this.port;
  }

  // prepend ? to query
  if (query.length) {
    query = '?' + query;
  }

  return schema + '://' + this.hostname + port + this.path + query;
};

},{"../transport":37,"debug":32,"engine.io-parser":44,"inherits":53,"parseqs":55,"xmlhttprequest":43}],42:[function(require,module,exports){
/**
 * Module dependencies.
 */

var Transport = require('../transport');
var parser = require('engine.io-parser');
var parseqs = require('parseqs');
var debug = require('debug')('engine.io-client:websocket');
var inherit = require('inherits');

/**
 * `ws` exposes a WebSocket-compatible interface in
 * Node, or the `WebSocket` or `MozWebSocket` globals
 * in the browser.
 */

var WebSocket = require('ws');

/**
 * Module exports.
 */

module.exports = WS;

/**
 * WebSocket transport constructor.
 *
 * @api {Object} connection options
 * @api public
 */

function WS(opts){
  var forceBase64 = (opts && opts.forceBase64);
  if (forceBase64) {
    this.supportsBinary = false;
  }
  Transport.call(this, opts);
}

/**
 * Inherits from Transport.
 */

inherit(WS, Transport);

/**
 * Transport name.
 *
 * @api public
 */

WS.prototype.name = 'websocket';

/*
 * WebSockets support binary
 */

WS.prototype.supportsBinary = true;

/**
 * Opens socket.
 *
 * @api private
 */

WS.prototype.doOpen = function(){
  if (!this.check()) {
    // let probe timeout
    return;
  }

  var self = this;
  var uri = this.uri();
  var protocols = void(0);
  var opts = { agent: this.agent };

  this.ws = new WebSocket(uri, protocols, opts);

  if (this.ws.binaryType === undefined) {
    this.supportsBinary = false;
  }

  this.ws.binaryType = 'arraybuffer';
  this.addEventListeners();
};

/**
 * Adds event listeners to the socket
 *
 * @api private
 */

WS.prototype.addEventListeners = function(){
  var self = this;

  this.ws.onopen = function(){
    self.onOpen();
  };
  this.ws.onclose = function(){
    self.onClose();
  };
  this.ws.onmessage = function(ev){
    self.onData(ev.data);
  };
  this.ws.onerror = function(e){
    self.onError('websocket error', e);
  };
};

/**
 * Override `onData` to use a timer on iOS.
 * See: https://gist.github.com/mloughran/2052006
 *
 * @api private
 */

if ('undefined' != typeof navigator
  && /iPad|iPhone|iPod/i.test(navigator.userAgent)) {
  WS.prototype.onData = function(data){
    var self = this;
    setTimeout(function(){
      Transport.prototype.onData.call(self, data);
    }, 0);
  };
}

/**
 * Writes data to socket.
 *
 * @param {Array} array of packets.
 * @api private
 */

WS.prototype.write = function(packets){
  var self = this;
  this.writable = false;
  // encodePacket efficient as it uses WS framing
  // no need for encodePayload
  for (var i = 0, l = packets.length; i < l; i++) {
    parser.encodePacket(packets[i], this.supportsBinary, function(data) {
      //Sometimes the websocket has already been closed but the browser didn't
      //have a chance of informing us about it yet, in that case send will
      //throw an error
      try {
        self.ws.send(data);
      } catch (e){
        debug('websocket closed before onclose event');
      }
    });
  }

  function ondrain() {
    self.writable = true;
    self.emit('drain');
  }
  // fake drain
  // defer to next tick to allow Socket to clear writeBuffer
  setTimeout(ondrain, 0);
};

/**
 * Called upon close
 *
 * @api private
 */

WS.prototype.onClose = function(){
  Transport.prototype.onClose.call(this);
};

/**
 * Closes socket.
 *
 * @api private
 */

WS.prototype.doClose = function(){
  if (typeof this.ws !== 'undefined') {
    this.ws.close();
  }
};

/**
 * Generates uri for connection.
 *
 * @api private
 */

WS.prototype.uri = function(){
  var query = this.query || {};
  var schema = this.secure ? 'wss' : 'ws';
  var port = '';

  // avoid port if default for schema
  if (this.port && (('wss' == schema && this.port != 443)
    || ('ws' == schema && this.port != 80))) {
    port = ':' + this.port;
  }

  // append timestamp to URI
  if (this.timestampRequests) {
    query[this.timestampParam] = +new Date;
  }

  // communicate binary support capabilities
  if (!this.supportsBinary) {
    query.b64 = 1;
  }

  query = parseqs.encode(query);

  // prepend ? to query
  if (query.length) {
    query = '?' + query;
  }

  return schema + '://' + this.hostname + port + this.path + query;
};

/**
 * Feature detection for WebSocket.
 *
 * @return {Boolean} whether this transport is available.
 * @api public
 */

WS.prototype.check = function(){
  return !!WebSocket && !('__initialize' in WebSocket && this.name === WS.prototype.name);
};

},{"../transport":37,"debug":32,"engine.io-parser":44,"inherits":53,"parseqs":55,"ws":56}],43:[function(require,module,exports){
// browser shim for xmlhttprequest module
var hasCORS = require('has-cors');

module.exports = function(opts) {
  var xdomain = opts.xdomain;

  // XMLHttpRequest can be disabled on IE
  try {
    if ('undefined' != typeof XMLHttpRequest && (!xdomain || hasCORS)) {
      return new XMLHttpRequest();
    }
  } catch (e) { }

  if (!xdomain) {
    try {
      return new ActiveXObject('Microsoft.XMLHTTP');
    } catch(e) { }
  }
}

},{"has-cors":51}],44:[function(require,module,exports){
(function (global){
/**
 * Module dependencies.
 */

var keys = require('./keys');
var sliceBuffer = require('arraybuffer.slice');
var base64encoder = require('base64-arraybuffer');
var after = require('after');
var utf8 = require('utf8');

/**
 * Check if we are running an android browser. That requires us to use
 * ArrayBuffer with polling transports...
 *
 * http://ghinda.net/jpeg-blob-ajax-android/
 */

var isAndroid = navigator.userAgent.match(/Android/i);

/**
 * Current protocol version.
 */

exports.protocol = 2;

/**
 * Packet types.
 */

var packets = exports.packets = {
    open:     0    // non-ws
  , close:    1    // non-ws
  , ping:     2
  , pong:     3
  , message:  4
  , upgrade:  5
  , noop:     6
};

var packetslist = keys(packets);

/**
 * Premade error packet.
 */

var err = { type: 'error', data: 'parser error' };

/**
 * Create a blob api even for blob builder when vendor prefixes exist
 */

var Blob = require('blob');

/**
 * Encodes a packet.
 *
 *     <packet type id> [ <data> ]
 *
 * Example:
 *
 *     5hello world
 *     3
 *     4
 *
 * Binary is encoded in an identical principle
 *
 * @api private
 */

exports.encodePacket = function (packet, supportsBinary, callback) {
  if (typeof supportsBinary == 'function') {
    callback = supportsBinary;
    supportsBinary = false;
  }

  var data = (packet.data === undefined)
    ? undefined
    : packet.data.buffer || packet.data;

  if (global.ArrayBuffer && data instanceof ArrayBuffer) {
    return encodeArrayBuffer(packet, supportsBinary, callback);
  } else if (Blob && data instanceof global.Blob) {
    return encodeBlob(packet, supportsBinary, callback);
  }

  // Sending data as a utf-8 string
  var encoded = packets[packet.type];

  // data fragment is optional
  if (undefined !== packet.data) {
    encoded += utf8.encode(String(packet.data));
  }

  return callback('' + encoded);

};

/**
 * Encode packet helpers for binary types
 */

function encodeArrayBuffer(packet, supportsBinary, callback) {
  if (!supportsBinary) {
    return exports.encodeBase64Packet(packet, callback);
  }

  var data = packet.data;
  var contentArray = new Uint8Array(data);
  var resultBuffer = new Uint8Array(1 + data.byteLength);

  resultBuffer[0] = packets[packet.type];
  for (var i = 0; i < contentArray.length; i++) {
    resultBuffer[i+1] = contentArray[i];
  }

  return callback(resultBuffer.buffer);
}

function encodeBlobAsArrayBuffer(packet, supportsBinary, callback) {
  if (!supportsBinary) {
    return exports.encodeBase64Packet(packet, callback);
  }

  var fr = new FileReader();
  fr.onload = function() {
    packet.data = fr.result;
    exports.encodePacket(packet, supportsBinary, callback);
  };
  return fr.readAsArrayBuffer(packet.data);
}

function encodeBlob(packet, supportsBinary, callback) {
  if (!supportsBinary) {
    return exports.encodeBase64Packet(packet, callback);
  }

  if (isAndroid) {
    return encodeBlobAsArrayBuffer(packet, supportsBinary, callback);
  }

  var length = new Uint8Array(1);
  length[0] = packets[packet.type];
  var blob = new Blob([length.buffer, packet.data]);

  return callback(blob);
}

/**
 * Encodes a packet with binary data in a base64 string
 *
 * @param {Object} packet, has `type` and `data`
 * @return {String} base64 encoded message
 */

exports.encodeBase64Packet = function(packet, callback) {
  var message = 'b' + exports.packets[packet.type];
  if (Blob && packet.data instanceof Blob) {
    var fr = new FileReader();
    fr.onload = function() {
      var b64 = fr.result.split(',')[1];
      callback(message + b64);
    };
    return fr.readAsDataURL(packet.data);
  }

  var b64data;
  try {
    b64data = String.fromCharCode.apply(null, new Uint8Array(packet.data));
  } catch (e) {
    // iPhone Safari doesn't let you apply with typed arrays
    var typed = new Uint8Array(packet.data);
    var basic = new Array(typed.length);
    for (var i = 0; i < typed.length; i++) {
      basic[i] = typed[i];
    }
    b64data = String.fromCharCode.apply(null, basic);
  }
  message += global.btoa(b64data);
  return callback(message);
};

/**
 * Decodes a packet. Changes format to Blob if requested.
 *
 * @return {Object} with `type` and `data` (if any)
 * @api private
 */

exports.decodePacket = function (data, binaryType) {
  // String data
  if (typeof data == 'string' || data === undefined) {
    if (data.charAt(0) == 'b') {
      return exports.decodeBase64Packet(data.substr(1), binaryType);
    }

    data = utf8.decode(data);
    var type = data.charAt(0);

    if (Number(type) != type || !packetslist[type]) {
      return err;
    }

    if (data.length > 1) {
      return { type: packetslist[type], data: data.substring(1) };
    } else {
      return { type: packetslist[type] };
    }
  }

  var asArray = new Uint8Array(data);
  var type = asArray[0];
  var rest = sliceBuffer(data, 1);
  if (Blob && binaryType === 'blob') {
    rest = new Blob([rest]);
  }
  return { type: packetslist[type], data: rest };
};

/**
 * Decodes a packet encoded in a base64 string
 *
 * @param {String} base64 encoded message
 * @return {Object} with `type` and `data` (if any)
 */

exports.decodeBase64Packet = function(msg, binaryType) {
  var type = packetslist[msg.charAt(0)];
  if (!global.ArrayBuffer) {
    return { type: type, data: { base64: true, data: msg.substr(1) } };
  }

  var data = base64encoder.decode(msg.substr(1));

  if (binaryType === 'blob' && Blob) {
    data = new Blob([data]);
  }

  return { type: type, data: data };
};

/**
 * Encodes multiple messages (payload).
 *
 *     <length>:data
 *
 * Example:
 *
 *     11:hello world2:hi
 *
 * If any contents are binary, they will be encoded as base64 strings. Base64
 * encoded strings are marked with a b before the length specifier
 *
 * @param {Array} packets
 * @api private
 */

exports.encodePayload = function (packets, supportsBinary, callback) {
  if (typeof supportsBinary == 'function') {
    callback = supportsBinary;
    supportsBinary = null;
  }

  if (supportsBinary) {
    if (Blob && !isAndroid) {
      return exports.encodePayloadAsBlob(packets, callback);
    }

    return exports.encodePayloadAsArrayBuffer(packets, callback);
  }

  if (!packets.length) {
    return callback('0:');
  }

  function setLengthHeader(message) {
    return message.length + ':' + message;
  }

  function encodeOne(packet, doneCallback) {
    exports.encodePacket(packet, supportsBinary, function(message) {
      doneCallback(null, setLengthHeader(message));
    });
  }

  map(packets, encodeOne, function(err, results) {
    return callback(results.join(''));
  });
};

/**
 * Async array map using after
 */

function map(ary, each, done) {
  var result = new Array(ary.length);
  var next = after(ary.length, done);

  var eachWithIndex = function(i, el, cb) {
    each(el, function(error, msg) {
      result[i] = msg;
      cb(error, result);
    });
  };

  for (var i = 0; i < ary.length; i++) {
    eachWithIndex(i, ary[i], next);
  }
}

/*
 * Decodes data when a payload is maybe expected. Possible binary contents are
 * decoded from their base64 representation
 *
 * @param {String} data, callback method
 * @api public
 */

exports.decodePayload = function (data, binaryType, callback) {
  if (typeof data != 'string') {
    return exports.decodePayloadAsBinary(data, binaryType, callback);
  }

  if (typeof binaryType === 'function') {
    callback = binaryType;
    binaryType = null;
  }

  var packet;
  if (data == '') {
    // parser error - ignoring payload
    return callback(err, 0, 1);
  }

  var length = ''
    , n, msg;

  for (var i = 0, l = data.length; i < l; i++) {
    var chr = data.charAt(i);

    if (':' != chr) {
      length += chr;
    } else {
      if ('' == length || (length != (n = Number(length)))) {
        // parser error - ignoring payload
        return callback(err, 0, 1);
      }

      msg = data.substr(i + 1, n);

      if (length != msg.length) {
        // parser error - ignoring payload
        return callback(err, 0, 1);
      }

      if (msg.length) {
        packet = exports.decodePacket(msg, binaryType);

        if (err.type == packet.type && err.data == packet.data) {
          // parser error in individual packet - ignoring payload
          return callback(err, 0, 1);
        }

        var ret = callback(packet, i + n, l);
        if (false === ret) return;
      }

      // advance cursor
      i += n;
      length = '';
    }
  }

  if (length != '') {
    // parser error - ignoring payload
    return callback(err, 0, 1);
  }

};

/**
 * Encodes multiple messages (payload) as binary.
 *
 * <1 = binary, 0 = string><number from 0-9><number from 0-9>[...]<number
 * 255><data>
 *
 * Example:
 * 1 3 255 1 2 3, if the binary contents are interpreted as 8 bit integers
 *
 * @param {Array} packets
 * @return {ArrayBuffer} encoded payload
 * @api private
 */

exports.encodePayloadAsArrayBuffer = function(packets, callback) {
  if (!packets.length) {
    return callback(new ArrayBuffer(0));
  }

  function encodeOne(packet, doneCallback) {
    exports.encodePacket(packet, true, function(data) {
      return doneCallback(null, data);
    });
  }

  map(packets, encodeOne, function(err, encodedPackets) {
    var totalLength = encodedPackets.reduce(function(acc, p) {
      var len;
      if (typeof p === 'string'){
        len = p.length;
      } else {
        len = p.byteLength;
      }
      return acc + len.toString().length + len + 2; // string/binary identifier + separator = 2
    }, 0);

    var resultArray = new Uint8Array(totalLength);

    var bufferIndex = 0;
    encodedPackets.forEach(function(p) {
      var isString = typeof p === 'string';
      var ab = p;
      if (isString) {
        var view = new Uint8Array(p.length);
        for (var i = 0; i < p.length; i++) {
          view[i] = p.charCodeAt(i);
        }
        ab = view.buffer;
      }

      if (isString) { // not true binary
        resultArray[bufferIndex++] = 0;
      } else { // true binary
        resultArray[bufferIndex++] = 1;
      }

      var lenStr = ab.byteLength.toString();
      for (var i = 0; i < lenStr.length; i++) {
        resultArray[bufferIndex++] = parseInt(lenStr[i]);
      }
      resultArray[bufferIndex++] = 255;

      var view = new Uint8Array(ab);
      for (var i = 0; i < view.length; i++) {
        resultArray[bufferIndex++] = view[i];
      }
    });

    return callback(resultArray.buffer);
  });
};

/**
 * Encode as Blob
 */

exports.encodePayloadAsBlob = function(packets, callback) {
  function encodeOne(packet, doneCallback) {
    exports.encodePacket(packet, true, function(encoded) {
      var binaryIdentifier = new Uint8Array(1);
      binaryIdentifier[0] = 1;
      if (typeof encoded === 'string') {
        var view = new Uint8Array(encoded.length);
        for (var i = 0; i < encoded.length; i++) {
          view[i] = encoded.charCodeAt(i);
        }
        encoded = view.buffer;
        binaryIdentifier[0] = 0;
      }

      var len = (encoded instanceof ArrayBuffer)
        ? encoded.byteLength
        : encoded.size;

      var lenStr = len.toString();
      var lengthAry = new Uint8Array(lenStr.length + 1);
      for (var i = 0; i < lenStr.length; i++) {
        lengthAry[i] = parseInt(lenStr[i]);
      }
      lengthAry[lenStr.length] = 255;

      if (Blob) {
        var blob = new Blob([binaryIdentifier.buffer, lengthAry.buffer, encoded]);
        doneCallback(null, blob);
      }
    });
  }

  map(packets, encodeOne, function(err, results) {
    return callback(new Blob(results));
  });
};

/*
 * Decodes data when a payload is maybe expected. Strings are decoded by
 * interpreting each byte as a key code for entries marked to start with 0. See
 * description of encodePayloadAsBinary
 *
 * @param {ArrayBuffer} data, callback method
 * @api public
 */

exports.decodePayloadAsBinary = function (data, binaryType, callback) {
  if (typeof binaryType === 'function') {
    callback = binaryType;
    binaryType = null;
  }

  var bufferTail = data;
  var buffers = [];

  while (bufferTail.byteLength > 0) {
    var tailArray = new Uint8Array(bufferTail);
    var isString = tailArray[0] === 0;
    var msgLength = '';
    for (var i = 1; ; i++) {
      if (tailArray[i] == 255) break;
      msgLength += tailArray[i];
    }
    bufferTail = sliceBuffer(bufferTail, 2 + msgLength.length);
    msgLength = parseInt(msgLength);

    var msg = sliceBuffer(bufferTail, 0, msgLength);
    if (isString) {
      try {
        msg = String.fromCharCode.apply(null, new Uint8Array(msg));
      } catch (e) {
        // iPhone Safari doesn't let you apply to typed arrays
        var typed = new Uint8Array(msg);
        msg = '';
        for (var i = 0; i < typed.length; i++) {
          msg += String.fromCharCode(typed[i]);
        }
      }
    }
    buffers.push(msg);
    bufferTail = sliceBuffer(bufferTail, msgLength);
  }

  var total = buffers.length;
  buffers.forEach(function(buffer, i) {
    callback(exports.decodePacket(buffer, binaryType), i, total);
  });
};

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./keys":45,"after":46,"arraybuffer.slice":47,"base64-arraybuffer":48,"blob":49,"utf8":50}],45:[function(require,module,exports){

/**
 * Gets the keys for an object.
 *
 * @return {Array} keys
 * @api private
 */

module.exports = Object.keys || function keys (obj){
  var arr = [];
  var has = Object.prototype.hasOwnProperty;

  for (var i in obj) {
    if (has.call(obj, i)) {
      arr.push(i);
    }
  }
  return arr;
};

},{}],46:[function(require,module,exports){
module.exports = after

function after(count, callback, err_cb) {
    var bail = false
    err_cb = err_cb || noop
    proxy.count = count

    return (count === 0) ? callback() : proxy

    function proxy(err, result) {
        if (proxy.count <= 0) {
            throw new Error('after called too many times')
        }
        --proxy.count

        // after first error, rest are passed to err_cb
        if (err) {
            bail = true
            callback(err)
            // future error callbacks will go to error handler
            callback = err_cb
        } else if (proxy.count === 0 && !bail) {
            callback(null, result)
        }
    }
}

function noop() {}

},{}],47:[function(require,module,exports){
/**
 * An abstraction for slicing an arraybuffer even when
 * ArrayBuffer.prototype.slice is not supported
 *
 * @api public
 */

module.exports = function(arraybuffer, start, end) {
  var bytes = arraybuffer.byteLength;
  start = start || 0;
  end = end || bytes;

  if (arraybuffer.slice) { return arraybuffer.slice(start, end); }

  if (start < 0) { start += bytes; }
  if (end < 0) { end += bytes; }
  if (end > bytes) { end = bytes; }

  if (start >= bytes || start >= end || bytes === 0) {
    return new ArrayBuffer(0);
  }

  var abv = new Uint8Array(arraybuffer);
  var result = new Uint8Array(end - start);
  for (var i = start, ii = 0; i < end; i++, ii++) {
    result[ii] = abv[i];
  }
  return result.buffer;
};

},{}],48:[function(require,module,exports){
/*
 * base64-arraybuffer
 * https://github.com/niklasvh/base64-arraybuffer
 *
 * Copyright (c) 2012 Niklas von Hertzen
 * Licensed under the MIT license.
 */
(function(chars){
  "use strict";

  exports.encode = function(arraybuffer) {
    var bytes = new Uint8Array(arraybuffer),
    i, len = bytes.length, base64 = "";

    for (i = 0; i < len; i+=3) {
      base64 += chars[bytes[i] >> 2];
      base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
      base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
      base64 += chars[bytes[i + 2] & 63];
    }

    if ((len % 3) === 2) {
      base64 = base64.substring(0, base64.length - 1) + "=";
    } else if (len % 3 === 1) {
      base64 = base64.substring(0, base64.length - 2) + "==";
    }

    return base64;
  };

  exports.decode =  function(base64) {
    var bufferLength = base64.length * 0.75,
    len = base64.length, i, p = 0,
    encoded1, encoded2, encoded3, encoded4;

    if (base64[base64.length - 1] === "=") {
      bufferLength--;
      if (base64[base64.length - 2] === "=") {
        bufferLength--;
      }
    }

    var arraybuffer = new ArrayBuffer(bufferLength),
    bytes = new Uint8Array(arraybuffer);

    for (i = 0; i < len; i+=4) {
      encoded1 = chars.indexOf(base64[i]);
      encoded2 = chars.indexOf(base64[i+1]);
      encoded3 = chars.indexOf(base64[i+2]);
      encoded4 = chars.indexOf(base64[i+3]);

      bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }

    return arraybuffer;
  };
})("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");

},{}],49:[function(require,module,exports){
(function (global){
/**
 * Create a blob builder even when vendor prefixes exist
 */

var BlobBuilder = global.BlobBuilder
  || global.WebKitBlobBuilder
  || global.MSBlobBuilder
  || global.MozBlobBuilder;

/**
 * Check if Blob constructor is supported
 */

var blobSupported = (function() {
  try {
    var b = new Blob(['hi']);
    return b.size == 2;
  } catch(e) {
    return false;
  }
})();

/**
 * Check if BlobBuilder is supported
 */

var blobBuilderSupported = BlobBuilder
  && BlobBuilder.prototype.append
  && BlobBuilder.prototype.getBlob;

function BlobBuilderConstructor(ary, options) {
  options = options || {};

  var bb = new BlobBuilder();
  for (var i = 0; i < ary.length; i++) {
    bb.append(ary[i]);
  }
  return (options.type) ? bb.getBlob(options.type) : bb.getBlob();
};

module.exports = (function() {
  if (blobSupported) {
    return global.Blob;
  } else if (blobBuilderSupported) {
    return BlobBuilderConstructor;
  } else {
    return undefined;
  }
})();

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],50:[function(require,module,exports){
(function (global){
/*! http://mths.be/utf8js v2.0.0 by @mathias */
;(function(root) {

	// Detect free variables `exports`
	var freeExports = typeof exports == 'object' && exports;

	// Detect free variable `module`
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;

	// Detect free variable `global`, from Node.js or Browserified code,
	// and use it as `root`
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/*--------------------------------------------------------------------------*/

	var stringFromCharCode = String.fromCharCode;

	// Taken from http://mths.be/punycode
	function ucs2decode(string) {
		var output = [];
		var counter = 0;
		var length = string.length;
		var value;
		var extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	// Taken from http://mths.be/punycode
	function ucs2encode(array) {
		var length = array.length;
		var index = -1;
		var value;
		var output = '';
		while (++index < length) {
			value = array[index];
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
		}
		return output;
	}

	/*--------------------------------------------------------------------------*/

	function createByte(codePoint, shift) {
		return stringFromCharCode(((codePoint >> shift) & 0x3F) | 0x80);
	}

	function encodeCodePoint(codePoint) {
		if ((codePoint & 0xFFFFFF80) == 0) { // 1-byte sequence
			return stringFromCharCode(codePoint);
		}
		var symbol = '';
		if ((codePoint & 0xFFFFF800) == 0) { // 2-byte sequence
			symbol = stringFromCharCode(((codePoint >> 6) & 0x1F) | 0xC0);
		}
		else if ((codePoint & 0xFFFF0000) == 0) { // 3-byte sequence
			symbol = stringFromCharCode(((codePoint >> 12) & 0x0F) | 0xE0);
			symbol += createByte(codePoint, 6);
		}
		else if ((codePoint & 0xFFE00000) == 0) { // 4-byte sequence
			symbol = stringFromCharCode(((codePoint >> 18) & 0x07) | 0xF0);
			symbol += createByte(codePoint, 12);
			symbol += createByte(codePoint, 6);
		}
		symbol += stringFromCharCode((codePoint & 0x3F) | 0x80);
		return symbol;
	}

	function utf8encode(string) {
		var codePoints = ucs2decode(string);

		// console.log(JSON.stringify(codePoints.map(function(x) {
		// 	return 'U+' + x.toString(16).toUpperCase();
		// })));

		var length = codePoints.length;
		var index = -1;
		var codePoint;
		var byteString = '';
		while (++index < length) {
			codePoint = codePoints[index];
			byteString += encodeCodePoint(codePoint);
		}
		return byteString;
	}

	/*--------------------------------------------------------------------------*/

	function readContinuationByte() {
		if (byteIndex >= byteCount) {
			throw Error('Invalid byte index');
		}

		var continuationByte = byteArray[byteIndex] & 0xFF;
		byteIndex++;

		if ((continuationByte & 0xC0) == 0x80) {
			return continuationByte & 0x3F;
		}

		// If we end up here, it’s not a continuation byte
		throw Error('Invalid continuation byte');
	}

	function decodeSymbol() {
		var byte1;
		var byte2;
		var byte3;
		var byte4;
		var codePoint;

		if (byteIndex > byteCount) {
			throw Error('Invalid byte index');
		}

		if (byteIndex == byteCount) {
			return false;
		}

		// Read first byte
		byte1 = byteArray[byteIndex] & 0xFF;
		byteIndex++;

		// 1-byte sequence (no continuation bytes)
		if ((byte1 & 0x80) == 0) {
			return byte1;
		}

		// 2-byte sequence
		if ((byte1 & 0xE0) == 0xC0) {
			var byte2 = readContinuationByte();
			codePoint = ((byte1 & 0x1F) << 6) | byte2;
			if (codePoint >= 0x80) {
				return codePoint;
			} else {
				throw Error('Invalid continuation byte');
			}
		}

		// 3-byte sequence (may include unpaired surrogates)
		if ((byte1 & 0xF0) == 0xE0) {
			byte2 = readContinuationByte();
			byte3 = readContinuationByte();
			codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
			if (codePoint >= 0x0800) {
				return codePoint;
			} else {
				throw Error('Invalid continuation byte');
			}
		}

		// 4-byte sequence
		if ((byte1 & 0xF8) == 0xF0) {
			byte2 = readContinuationByte();
			byte3 = readContinuationByte();
			byte4 = readContinuationByte();
			codePoint = ((byte1 & 0x0F) << 0x12) | (byte2 << 0x0C) |
				(byte3 << 0x06) | byte4;
			if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
				return codePoint;
			}
		}

		throw Error('Invalid UTF-8 detected');
	}

	var byteArray;
	var byteCount;
	var byteIndex;
	function utf8decode(byteString) {
		byteArray = ucs2decode(byteString);
		byteCount = byteArray.length;
		byteIndex = 0;
		var codePoints = [];
		var tmp;
		while ((tmp = decodeSymbol()) !== false) {
			codePoints.push(tmp);
		}
		return ucs2encode(codePoints);
	}

	/*--------------------------------------------------------------------------*/

	var utf8 = {
		'version': '2.0.0',
		'encode': utf8encode,
		'decode': utf8decode
	};

	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define(function() {
			return utf8;
		});
	}	else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = utf8;
		} else { // in Narwhal or RingoJS v0.7.0-
			var object = {};
			var hasOwnProperty = object.hasOwnProperty;
			for (var key in utf8) {
				hasOwnProperty.call(utf8, key) && (freeExports[key] = utf8[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.utf8 = utf8;
	}

}(this));

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],51:[function(require,module,exports){

/**
 * Module dependencies.
 */

var global = require('global');

/**
 * Module exports.
 *
 * Logic borrowed from Modernizr:
 *
 *   - https://github.com/Modernizr/Modernizr/blob/master/feature-detects/cors.js
 */

try {
  module.exports = 'XMLHttpRequest' in global &&
    'withCredentials' in new global.XMLHttpRequest();
} catch (err) {
  // if XMLHttp support is disabled in IE then it will throw
  // when trying to create
  module.exports = false;
}

},{"global":52}],52:[function(require,module,exports){

/**
 * Returns `this`. Execute this without a "context" (i.e. without it being
 * attached to an object of the left-hand side), and `this` points to the
 * "global" scope of the current JS execution.
 */

module.exports = (function () { return this; })();

},{}],53:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],54:[function(require,module,exports){
(function (global){
/**
 * JSON parse.
 *
 * @see Based on jQuery#parseJSON (MIT) and JSON2
 * @api private
 */

var rvalidchars = /^[\],:{}\s]*$/;
var rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
var rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
var rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g;
var rtrimLeft = /^\s+/;
var rtrimRight = /\s+$/;

module.exports = function parsejson(data) {
  if ('string' != typeof data || !data) {
    return null;
  }

  data = data.replace(rtrimLeft, '').replace(rtrimRight, '');

  // Attempt to parse using the native JSON parser first
  if (global.JSON && JSON.parse) {
    return JSON.parse(data);
  }

  if (rvalidchars.test(data.replace(rvalidescape, '@')
      .replace(rvalidtokens, ']')
      .replace(rvalidbraces, ''))) {
    return (new Function('return ' + data))();
  }
};
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],55:[function(require,module,exports){
/**
 * Compiles a querystring
 * Returns string representation of the object
 *
 * @param {Object}
 * @api private
 */

exports.encode = function (obj) {
  var str = '';

  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      if (str.length) str += '&';
      str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
    }
  }

  return str;
};

/**
 * Parses a simple querystring into an object
 *
 * @param {String} qs
 * @api private
 */

exports.decode = function(qs){
  var qry = {};
  var pairs = qs.split('&');
  for (var i = 0, l = pairs.length; i < l; i++) {
    var pair = pairs[i].split('=');
    qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
  }
  return qry;
};

},{}],56:[function(require,module,exports){

/**
 * Module dependencies.
 */

var global = (function() { return this; })();

/**
 * WebSocket constructor.
 */

var WebSocket = global.WebSocket || global.MozWebSocket;

/**
 * Module exports.
 */

module.exports = WebSocket ? ws : null;

/**
 * WebSocket constructor.
 *
 * The third `opts` options object gets ignored in web browsers, since it's
 * non-standard, and throws a TypeError if passed to the constructor.
 * See: https://github.com/einaros/ws/issues/227
 *
 * @param {String} uri
 * @param {Array} protocols (optional)
 * @param {Object) opts (optional)
 * @api public
 */

function ws(uri, protocols, opts) {
  var instance;
  if (protocols) {
    instance = new WebSocket(uri, protocols);
  } else {
    instance = new WebSocket(uri);
  }
  return instance;
}

if (WebSocket) ws.prototype = WebSocket.prototype;

},{}],57:[function(require,module,exports){
(function (global,Buffer){
/*
 * Module requirements.
 */

var isArray = require('isarray');

/**
 * Module exports.
 */

module.exports = hasBinary;

/**
 * Checks for binary data.
 *
 * Right now only Buffer and ArrayBuffer are supported..
 *
 * @param {Object} anything
 * @api public
 */

function hasBinary(data) {

  function recursiveCheckForBinary(obj) { 
    if (!obj) return false;

    if ( (global.Buffer && Buffer.isBuffer(obj)) ||
         (global.ArrayBuffer && obj instanceof ArrayBuffer) ||
         (global.Blob && obj instanceof Blob) ||
         (global.File && obj instanceof File)
        ) {
      return true;
    }

    if (isArray(obj)) {
      for (var i = 0; i < obj.length; i++) {
          if (recursiveCheckForBinary(obj[i])) {
              return true;
          }
      }
    } else if (obj && 'object' == typeof obj) {
      if (obj.toJSON) {
        obj = obj.toJSON();
      }

      for (var key in obj) {
        if (recursiveCheckForBinary(obj[key])) {
          return true;
        }
      }
    }

    return false;
  }

  return recursiveCheckForBinary(data);
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"buffer":1,"isarray":58}],58:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],59:[function(require,module,exports){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],60:[function(require,module,exports){

/**
 * HOP ref.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Return own keys in `obj`.
 *
 * @param {Object} obj
 * @return {Array}
 * @api public
 */

exports.keys = Object.keys || function(obj){
  var keys = [];
  for (var key in obj) {
    if (has.call(obj, key)) {
      keys.push(key);
    }
  }
  return keys;
};

/**
 * Return own values in `obj`.
 *
 * @param {Object} obj
 * @return {Array}
 * @api public
 */

exports.values = function(obj){
  var vals = [];
  for (var key in obj) {
    if (has.call(obj, key)) {
      vals.push(obj[key]);
    }
  }
  return vals;
};

/**
 * Merge `b` into `a`.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api public
 */

exports.merge = function(a, b){
  for (var key in b) {
    if (has.call(b, key)) {
      a[key] = b[key];
    }
  }
  return a;
};

/**
 * Return length of `obj`.
 *
 * @param {Object} obj
 * @return {Number}
 * @api public
 */

exports.length = function(obj){
  return exports.keys(obj).length;
};

/**
 * Check if `obj` is empty.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api public
 */

exports.isEmpty = function(obj){
  return 0 == exports.length(obj);
};
},{}],61:[function(require,module,exports){
/**
 * Parses an URI
 *
 * @author Steven Levithan <stevenlevithan.com> (MIT license)
 * @api private
 */

var re = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

var parts = [
    'source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host'
  , 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'
];

module.exports = function parseuri(str) {
  var m = re.exec(str || '')
    , uri = {}
    , i = 14;

  while (i--) {
    uri[parts[i]] = m[i] || '';
  }

  return uri;
};

},{}],62:[function(require,module,exports){
(function (global,Buffer){
/**
 * Modle requirements
 */

var isArray = require('isarray');

/**
 * Replaces every Buffer | ArrayBuffer in packet with a numbered placeholder.
 * Anything with blobs or files should be fed through removeBlobs before coming
 * here.
 *
 * @param {Object} packet - socket.io event packet
 * @return {Object} with deconstructed packet and list of buffers
 * @api public
 */

exports.deconstructPacket = function(packet) {
    var buffers = [];
    var packetData = packet.data;

    function deconstructBinPackRecursive(data) {
        if (!data) return data;

        if ((global.Buffer && Buffer.isBuffer(data)) ||
            (global.ArrayBuffer && data instanceof ArrayBuffer)) { // replace binary
            var placeholder = {_placeholder: true, num: buffers.length};
            buffers.push(data);
            return placeholder;
        } else if (isArray(data)) {
            var newData = new Array(data.length);
            for (var i = 0; i < data.length; i++) {
                newData[i] = deconstructBinPackRecursive(data[i]);
            }
            return newData;
        } else if ('object' == typeof data && !(data instanceof Date)) {
            var newData = {};
            for (var key in data) {
                newData[key] = deconstructBinPackRecursive(data[key]);
            }
            return newData;
        }
        return data;
    }

    var pack = packet;
    pack.data = deconstructBinPackRecursive(packetData);
    pack.attachments = buffers.length; // number of binary 'attachments'
    return {packet: pack, buffers: buffers};
}

/**
 * Reconstructs a binary packet from its placeholder packet and buffers
 *
 * @param {Object} packet - event packet with placeholders
 * @param {Array} buffers - binary buffers to put in placeholder positions
 * @return {Object} reconstructed packet
 * @api public
 */

 exports.reconstructPacket = function(packet, buffers) {
    var curPlaceHolder = 0;

    function reconstructBinPackRecursive(data) {
        if (data && data._placeholder) {
            var buf = buffers[data.num]; // appropriate buffer (should be natural order anyway)
            return buf;
        } else if (isArray(data)) {
            for (var i = 0; i < data.length; i++) {
                data[i] = reconstructBinPackRecursive(data[i]);
            }
            return data;
        } else if (data && 'object' == typeof data) {
            for (var key in data) {
                data[key] = reconstructBinPackRecursive(data[key]);
            }
            return data;
        }
        return data;
    }

    packet.data = reconstructBinPackRecursive(packet.data);
    packet.attachments = undefined; // no longer useful
    return packet;
 }

/**
 * Asynchronously removes Blobs or Files from data via
 * FileReader's readAsArrayBuffer method. Used before encoding
 * data as msgpack. Calls callback with the blobless data.
 *
 * @param {Object} data
 * @param {Function} callback
 * @api private
 */

exports.removeBlobs = function(data, callback) {

  function removeBlobsRecursive(obj, curKey, containingObject) {
    if (!obj) return obj;

    // convert any blob
    if ((global.Blob && obj instanceof Blob) ||
        (global.File && obj instanceof File)) {
      pendingBlobs++;

      // async filereader
      var fileReader = new FileReader();
      fileReader.onload = function() { // this.result == arraybuffer
        if (containingObject) {
          containingObject[curKey] = this.result;
        }
        else {
          bloblessData = this.result;
        }

        // if nothing pending its callback time
        if(! --pendingBlobs) {
          callback(bloblessData);
        }
      };

      fileReader.readAsArrayBuffer(obj); // blob -> arraybuffer
    }

    if (isArray(obj)) { // handle array
      for (var i = 0; i < obj.length; i++) {
        removeBlobsRecursive(obj[i], i, obj);
      }
    } else if (obj && 'object' == typeof obj && !isBuf(obj)) { // and object
      for (var key in obj) {
        removeBlobsRecursive(obj[key], key, obj);
      }
    }
  }

  var pendingBlobs = 0;
  var bloblessData = data;
  removeBlobsRecursive(bloblessData);
  if (!pendingBlobs) {
    callback(bloblessData);
  }
}

/**
 * Returns true if obj is a buffer or an arraybuffer.
 *
 * @api private
 */
function isBuf(obj) {
  return (global.Buffer && Buffer.isBuffer(obj)) ||
         (global.ArrayBuffer && obj instanceof ArrayBuffer);
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"buffer":1,"isarray":64}],63:[function(require,module,exports){
(function (global,Buffer){

/**
 * Module dependencies.
 */

var debug = require('debug')('socket.io-parser');
var json = require('json3');
var isArray = require('isarray');
var Emitter = require('emitter');
var binary = require('./binary');

/**
 * Protocol version.
 *
 * @api public
 */

exports.protocol = 3;

/**
 * Packet types.
 *
 * @api public
 */

exports.types = [
  'CONNECT',
  'DISCONNECT',
  'EVENT',
  'BINARY_EVENT',
  'ACK',
  'ERROR'
];

/**
 * Packet type `connect`.
 *
 * @api public
 */

exports.CONNECT = 0;

/**
 * Packet type `disconnect`.
 *
 * @api public
 */

exports.DISCONNECT = 1;

/**
 * Packet type `event`.
 *
 * @api public
 */

exports.EVENT = 2;

/**
 * Packet type `ack`.
 *
 * @api public
 */

exports.ACK = 3;

/**
 * Packet type `error`.
 *
 * @api public
 */

exports.ERROR = 4;

/**
 * Packet type 'binary event'
 *
 * @api public
 */

exports.BINARY_EVENT = 5;

exports.Encoder = Encoder

/**
 * A socket.io Encoder instance
 *
 * @api public
 */
function Encoder() {};

/**
 * Encode a packet as a single string if non-binary, or as a
 * buffer sequence, depending on packet type.
 *
 * @param {Object} obj - packet object
 * @param {Function} callback - function to handle encodings (likely engine.write)
 * @return Calls callback with Array of encodings
 * @api public
 */

Encoder.prototype.encode = function(obj, callback){
  debug('encoding packet %j', obj);

  if (exports.BINARY_EVENT == obj.type || exports.ACK == obj.type) {
    encodeAsBinary(obj, callback);
  }
  else {
    var encoding = encodeAsString(obj);
    callback([encoding]);
  }
};

/**
 * Encode packet as string.
 *
 * @param {Object} packet
 * @return {String} encoded
 * @api private
 */

function encodeAsString(obj) {
  var str = '';
  var nsp = false;

  // first is type
  str += obj.type;

  // attachments if we have them
  if (exports.BINARY_EVENT == obj.type || exports.ACK == obj.type) {
    str += obj.attachments;
    str += '-';
  }

  // if we have a namespace other than `/`
  // we append it followed by a comma `,`
  if (obj.nsp && '/' != obj.nsp) {
    nsp = true;
    str += obj.nsp;
  }

  // immediately followed by the id
  if (null != obj.id) {
    if (nsp) {
      str += ',';
      nsp = false;
    }
    str += obj.id;
  }

  // json data
  if (null != obj.data) {
    if (nsp) str += ',';
    str += json.stringify(obj.data);
  }

  debug('encoded %j as %s', obj, str);
  return str;
}

/**
 * Encode packet as 'buffer sequence' by removing blobs, and
 * deconstructing packet into object with placeholders and
 * a list of buffers.
 *
 * @param {Object} packet
 * @return {Buffer} encoded
 * @api private
 */

function encodeAsBinary(obj, callback) {

  function writeEncoding(bloblessData) {
    var deconstruction = binary.deconstructPacket(bloblessData);
    var pack = encodeAsString(deconstruction.packet);
    var buffers = deconstruction.buffers;

    buffers.unshift(pack); // add packet info to beginning of data list
    callback(buffers); // write all the buffers
  }

  binary.removeBlobs(obj, writeEncoding);
}

exports.Decoder = Decoder

/**
 * A socket.io Decoder instance
 *
 * @return {Object} decoder
 * @api public
 */

function Decoder() {
  this.reconstructor = null;
}

/**
 * Mix in `Emitter` with Decoder.
 */

Emitter(Decoder.prototype);

/**
 * Decodes an ecoded packet string into packet JSON.
 *
 * @param {String} obj - encoded packet
 * @return {Object} packet
 * @api public
 */

Decoder.prototype.add = function(obj) {
  var packet;
  if ('string' == typeof obj) {
    packet = decodeString(obj);
    if (exports.BINARY_EVENT == packet.type || exports.ACK == packet.type) { // binary packet's json
      this.reconstructor = new BinaryReconstructor(packet);

      // no attachments, labeled binary but no binary data to follow
      if (this.reconstructor.reconPack.attachments == 0) {
        this.emit('decoded', packet);
      }
    } else { // non-binary full packet
      this.emit('decoded', packet);
    }
  }
  else if ((global.Buffer && Buffer.isBuffer(obj)) ||
            (global.ArrayBuffer && obj instanceof ArrayBuffer) ||
            obj.base64) { // raw binary data
    if (!this.reconstructor) {
      throw new Error('got binary data when not reconstructing a packet');
    } else {
      packet = this.reconstructor.takeBinaryData(obj);
      if (packet) { // received final buffer
        this.reconstructor = null;
        this.emit('decoded', packet);
      }
    }
  }
  else {
    throw new Error('Unknown type: ' + obj);
  }
}

/**
 * Decode a packet String (JSON data)
 *
 * @param {String} str
 * @return {Object} packet
 * @api private
 */

function decodeString(str) {
  var p = {};
  var i = 0;

  // look up type
  p.type = Number(str.charAt(0));
  if (null == exports.types[p.type]) return error();

  // look up attachments if type binary
  if (exports.BINARY_EVENT == p.type || exports.ACK == p.type) {
    p.attachments = '';
    while (str.charAt(++i) != '-') {
      p.attachments += str.charAt(i);
    }
    p.attachments = Number(p.attachments);
  }

  // look up namespace (if any)
  if ('/' == str.charAt(i + 1)) {
    p.nsp = '';
    while (++i) {
      var c = str.charAt(i);
      if (',' == c) break;
      p.nsp += c;
      if (i + 1 == str.length) break;
    }
  } else {
    p.nsp = '/';
  }

  // look up id
  var next = str.charAt(i + 1);
  if ('' != next && Number(next) == next) {
    p.id = '';
    while (++i) {
      var c = str.charAt(i);
      if (null == c || Number(c) != c) {
        --i;
        break;
      }
      p.id += str.charAt(i);
      if (i + 1 == str.length) break;
    }
    p.id = Number(p.id);
  }

  // look up json data
  if (str.charAt(++i)) {
    try {
      p.data = json.parse(str.substr(i));
    } catch(e){
      return error();
    }
  }

  debug('decoded %s as %j', str, p);
  return p;
};

/**
 * Deallocates a parser's resources
 *
 * @api public
 */

Decoder.prototype.destroy = function() {
  if (this.reconstructor) {
    this.reconstructor.finishedReconstruction();
  }
}

/**
 * A manager of a binary event's 'buffer sequence'. Should
 * be constructed whenever a packet of type BINARY_EVENT is
 * decoded.
 *
 * @param {Object} packet
 * @return {BinaryReconstructor} initialized reconstructor
 * @api private
 */

function BinaryReconstructor(packet) {
  this.reconPack = packet;
  this.buffers = [];
}

/**
 * Method to be called when binary data received from connection
 * after a BINARY_EVENT packet.
 *
 * @param {Buffer | ArrayBuffer} binData - the raw binary data received
 * @return {null | Object} returns null if more binary data is expected or
 *   a reconstructed packet object if all buffers have been received.
 * @api private
 */

BinaryReconstructor.prototype.takeBinaryData = function(binData) {
  this.buffers.push(binData);
  if (this.buffers.length == this.reconPack.attachments) { // done with buffer list
    var packet = binary.reconstructPacket(this.reconPack, this.buffers);
    this.finishedReconstruction();
    return packet;
  }
  return null;
}

/**
 * Cleans up binary packet reconstruction variables.
 *
 * @api private
 */

BinaryReconstructor.prototype.finishedReconstruction = function() {
  this.reconPack = null;
  this.buffers = [];
}

function error(data){
  return {
    type: exports.ERROR,
    data: 'parser error'
  };
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./binary":62,"buffer":1,"debug":32,"emitter":33,"isarray":64,"json3":65}],64:[function(require,module,exports){
module.exports=require(58)
},{}],65:[function(require,module,exports){
/*! JSON v3.2.6 | http://bestiejs.github.io/json3 | Copyright 2012-2013, Kit Cambridge | http://kit.mit-license.org */
;(function (window) {
  // Convenience aliases.
  var getClass = {}.toString, isProperty, forEach, undef;

  // Detect the `define` function exposed by asynchronous module loaders. The
  // strict `define` check is necessary for compatibility with `r.js`.
  var isLoader = typeof define === "function" && define.amd;

  // Detect native implementations.
  var nativeJSON = typeof JSON == "object" && JSON;

  // Set up the JSON 3 namespace, preferring the CommonJS `exports` object if
  // available.
  var JSON3 = typeof exports == "object" && exports && !exports.nodeType && exports;

  if (JSON3 && nativeJSON) {
    // Explicitly delegate to the native `stringify` and `parse`
    // implementations in CommonJS environments.
    JSON3.stringify = nativeJSON.stringify;
    JSON3.parse = nativeJSON.parse;
  } else {
    // Export for web browsers, JavaScript engines, and asynchronous module
    // loaders, using the global `JSON` object if available.
    JSON3 = window.JSON = nativeJSON || {};
  }

  // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
  var isExtended = new Date(-3509827334573292);
  try {
    // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
    // results for certain dates in Opera >= 10.53.
    isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 &&
      // Safari < 2.0.2 stores the internal millisecond time value correctly,
      // but clips the values returned by the date methods to the range of
      // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
      isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
  } catch (exception) {}

  // Internal: Determines whether the native `JSON.stringify` and `parse`
  // implementations are spec-compliant. Based on work by Ken Snyder.
  function has(name) {
    if (has[name] !== undef) {
      // Return cached feature test result.
      return has[name];
    }

    var isSupported;
    if (name == "bug-string-char-index") {
      // IE <= 7 doesn't support accessing string characters using square
      // bracket notation. IE 8 only supports this for primitives.
      isSupported = "a"[0] != "a";
    } else if (name == "json") {
      // Indicates whether both `JSON.stringify` and `JSON.parse` are
      // supported.
      isSupported = has("json-stringify") && has("json-parse");
    } else {
      var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
      // Test `JSON.stringify`.
      if (name == "json-stringify") {
        var stringify = JSON3.stringify, stringifySupported = typeof stringify == "function" && isExtended;
        if (stringifySupported) {
          // A test function object with a custom `toJSON` method.
          (value = function () {
            return 1;
          }).toJSON = value;
          try {
            stringifySupported =
              // Firefox 3.1b1 and b2 serialize string, number, and boolean
              // primitives as object literals.
              stringify(0) === "0" &&
              // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
              // literals.
              stringify(new Number()) === "0" &&
              stringify(new String()) == '""' &&
              // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
              // does not define a canonical JSON representation (this applies to
              // objects with `toJSON` properties as well, *unless* they are nested
              // within an object or array).
              stringify(getClass) === undef &&
              // IE 8 serializes `undefined` as `"undefined"`. Safari <= 5.1.7 and
              // FF 3.1b3 pass this test.
              stringify(undef) === undef &&
              // Safari <= 5.1.7 and FF 3.1b3 throw `Error`s and `TypeError`s,
              // respectively, if the value is omitted entirely.
              stringify() === undef &&
              // FF 3.1b1, 2 throw an error if the given value is not a number,
              // string, array, object, Boolean, or `null` literal. This applies to
              // objects with custom `toJSON` methods as well, unless they are nested
              // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
              // methods entirely.
              stringify(value) === "1" &&
              stringify([value]) == "[1]" &&
              // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
              // `"[null]"`.
              stringify([undef]) == "[null]" &&
              // YUI 3.0.0b1 fails to serialize `null` literals.
              stringify(null) == "null" &&
              // FF 3.1b1, 2 halts serialization if an array contains a function:
              // `[1, true, getClass, 1]` serializes as "[1,true,],". FF 3.1b3
              // elides non-JSON values from objects and arrays, unless they
              // define custom `toJSON` methods.
              stringify([undef, getClass, null]) == "[null,null,null]" &&
              // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
              // where character escape codes are expected (e.g., `\b` => `\u0008`).
              stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
              // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
              stringify(null, value) === "1" &&
              stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
              // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
              // serialize extended years.
              stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
              // The milliseconds are optional in ES 5, but required in 5.1.
              stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
              // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
              // four-digit years instead of six-digit years. Credits: @Yaffle.
              stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
              // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
              // values less than 1000. Credits: @Yaffle.
              stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
          } catch (exception) {
            stringifySupported = false;
          }
        }
        isSupported = stringifySupported;
      }
      // Test `JSON.parse`.
      if (name == "json-parse") {
        var parse = JSON3.parse;
        if (typeof parse == "function") {
          try {
            // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
            // Conforming implementations should also coerce the initial argument to
            // a string prior to parsing.
            if (parse("0") === 0 && !parse(false)) {
              // Simple parsing test.
              value = parse(serialized);
              var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
              if (parseSupported) {
                try {
                  // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
                  parseSupported = !parse('"\t"');
                } catch (exception) {}
                if (parseSupported) {
                  try {
                    // FF 4.0 and 4.0.1 allow leading `+` signs and leading
                    // decimal points. FF 4.0, 4.0.1, and IE 9-10 also allow
                    // certain octal literals.
                    parseSupported = parse("01") !== 1;
                  } catch (exception) {}
                }
                if (parseSupported) {
                  try {
                    // FF 4.0, 4.0.1, and Rhino 1.7R3-R4 allow trailing decimal
                    // points. These environments, along with FF 3.1b1 and 2,
                    // also allow trailing commas in JSON objects and arrays.
                    parseSupported = parse("1.") !== 1;
                  } catch (exception) {}
                }
              }
            }
          } catch (exception) {
            parseSupported = false;
          }
        }
        isSupported = parseSupported;
      }
    }
    return has[name] = !!isSupported;
  }

  if (!has("json")) {
    // Common `[[Class]]` name aliases.
    var functionClass = "[object Function]";
    var dateClass = "[object Date]";
    var numberClass = "[object Number]";
    var stringClass = "[object String]";
    var arrayClass = "[object Array]";
    var booleanClass = "[object Boolean]";

    // Detect incomplete support for accessing string characters by index.
    var charIndexBuggy = has("bug-string-char-index");

    // Define additional utility methods if the `Date` methods are buggy.
    if (!isExtended) {
      var floor = Math.floor;
      // A mapping between the months of the year and the number of days between
      // January 1st and the first of the respective month.
      var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
      // Internal: Calculates the number of days between the Unix epoch and the
      // first day of the given month.
      var getDay = function (year, month) {
        return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
      };
    }

    // Internal: Determines if a property is a direct property of the given
    // object. Delegates to the native `Object#hasOwnProperty` method.
    if (!(isProperty = {}.hasOwnProperty)) {
      isProperty = function (property) {
        var members = {}, constructor;
        if ((members.__proto__ = null, members.__proto__ = {
          // The *proto* property cannot be set multiple times in recent
          // versions of Firefox and SeaMonkey.
          "toString": 1
        }, members).toString != getClass) {
          // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
          // supports the mutable *proto* property.
          isProperty = function (property) {
            // Capture and break the object's prototype chain (see section 8.6.2
            // of the ES 5.1 spec). The parenthesized expression prevents an
            // unsafe transformation by the Closure Compiler.
            var original = this.__proto__, result = property in (this.__proto__ = null, this);
            // Restore the original prototype chain.
            this.__proto__ = original;
            return result;
          };
        } else {
          // Capture a reference to the top-level `Object` constructor.
          constructor = members.constructor;
          // Use the `constructor` property to simulate `Object#hasOwnProperty` in
          // other environments.
          isProperty = function (property) {
            var parent = (this.constructor || constructor).prototype;
            return property in this && !(property in parent && this[property] === parent[property]);
          };
        }
        members = null;
        return isProperty.call(this, property);
      };
    }

    // Internal: A set of primitive types used by `isHostType`.
    var PrimitiveTypes = {
      'boolean': 1,
      'number': 1,
      'string': 1,
      'undefined': 1
    };

    // Internal: Determines if the given object `property` value is a
    // non-primitive.
    var isHostType = function (object, property) {
      var type = typeof object[property];
      return type == 'object' ? !!object[property] : !PrimitiveTypes[type];
    };

    // Internal: Normalizes the `for...in` iteration algorithm across
    // environments. Each enumerated key is yielded to a `callback` function.
    forEach = function (object, callback) {
      var size = 0, Properties, members, property;

      // Tests for bugs in the current environment's `for...in` algorithm. The
      // `valueOf` property inherits the non-enumerable flag from
      // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
      (Properties = function () {
        this.valueOf = 0;
      }).prototype.valueOf = 0;

      // Iterate over a new instance of the `Properties` class.
      members = new Properties();
      for (property in members) {
        // Ignore all properties inherited from `Object.prototype`.
        if (isProperty.call(members, property)) {
          size++;
        }
      }
      Properties = members = null;

      // Normalize the iteration algorithm.
      if (!size) {
        // A list of non-enumerable properties inherited from `Object.prototype`.
        members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
        // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
        // properties.
        forEach = function (object, callback) {
          var isFunction = getClass.call(object) == functionClass, property, length;
          var hasProperty = !isFunction && typeof object.constructor != 'function' && isHostType(object, 'hasOwnProperty') ? object.hasOwnProperty : isProperty;
          for (property in object) {
            // Gecko <= 1.0 enumerates the `prototype` property of functions under
            // certain conditions; IE does not.
            if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
              callback(property);
            }
          }
          // Manually invoke the callback for each non-enumerable property.
          for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
        };
      } else if (size == 2) {
        // Safari <= 2.0.4 enumerates shadowed properties twice.
        forEach = function (object, callback) {
          // Create a set of iterated properties.
          var members = {}, isFunction = getClass.call(object) == functionClass, property;
          for (property in object) {
            // Store each property name to prevent double enumeration. The
            // `prototype` property of functions is not enumerated due to cross-
            // environment inconsistencies.
            if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
              callback(property);
            }
          }
        };
      } else {
        // No bugs detected; use the standard `for...in` algorithm.
        forEach = function (object, callback) {
          var isFunction = getClass.call(object) == functionClass, property, isConstructor;
          for (property in object) {
            if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
              callback(property);
            }
          }
          // Manually invoke the callback for the `constructor` property due to
          // cross-environment inconsistencies.
          if (isConstructor || isProperty.call(object, (property = "constructor"))) {
            callback(property);
          }
        };
      }
      return forEach(object, callback);
    };

    // Public: Serializes a JavaScript `value` as a JSON string. The optional
    // `filter` argument may specify either a function that alters how object and
    // array members are serialized, or an array of strings and numbers that
    // indicates which properties should be serialized. The optional `width`
    // argument may be either a string or number that specifies the indentation
    // level of the output.
    if (!has("json-stringify")) {
      // Internal: A map of control characters and their escaped equivalents.
      var Escapes = {
        92: "\\\\",
        34: '\\"',
        8: "\\b",
        12: "\\f",
        10: "\\n",
        13: "\\r",
        9: "\\t"
      };

      // Internal: Converts `value` into a zero-padded string such that its
      // length is at least equal to `width`. The `width` must be <= 6.
      var leadingZeroes = "000000";
      var toPaddedString = function (width, value) {
        // The `|| 0` expression is necessary to work around a bug in
        // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
        return (leadingZeroes + (value || 0)).slice(-width);
      };

      // Internal: Double-quotes a string `value`, replacing all ASCII control
      // characters (characters with code unit values between 0 and 31) with
      // their escaped equivalents. This is an implementation of the
      // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
      var unicodePrefix = "\\u00";
      var quote = function (value) {
        var result = '"', index = 0, length = value.length, isLarge = length > 10 && charIndexBuggy, symbols;
        if (isLarge) {
          symbols = value.split("");
        }
        for (; index < length; index++) {
          var charCode = value.charCodeAt(index);
          // If the character is a control character, append its Unicode or
          // shorthand escape sequence; otherwise, append the character as-is.
          switch (charCode) {
            case 8: case 9: case 10: case 12: case 13: case 34: case 92:
              result += Escapes[charCode];
              break;
            default:
              if (charCode < 32) {
                result += unicodePrefix + toPaddedString(2, charCode.toString(16));
                break;
              }
              result += isLarge ? symbols[index] : charIndexBuggy ? value.charAt(index) : value[index];
          }
        }
        return result + '"';
      };

      // Internal: Recursively serializes an object. Implements the
      // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
      var serialize = function (property, object, callback, properties, whitespace, indentation, stack) {
        var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;
        try {
          // Necessary for host object support.
          value = object[property];
        } catch (exception) {}
        if (typeof value == "object" && value) {
          className = getClass.call(value);
          if (className == dateClass && !isProperty.call(value, "toJSON")) {
            if (value > -1 / 0 && value < 1 / 0) {
              // Dates are serialized according to the `Date#toJSON` method
              // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
              // for the ISO 8601 date time string format.
              if (getDay) {
                // Manually compute the year, month, date, hours, minutes,
                // seconds, and milliseconds if the `getUTC*` methods are
                // buggy. Adapted from @Yaffle's `date-shim` project.
                date = floor(value / 864e5);
                for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                date = 1 + date - getDay(year, month);
                // The `time` value specifies the time within the day (see ES
                // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                // to compute `A modulo B`, as the `%` operator does not
                // correspond to the `modulo` operation for negative numbers.
                time = (value % 864e5 + 864e5) % 864e5;
                // The hours, minutes, seconds, and milliseconds are obtained by
                // decomposing the time within the day. See section 15.9.1.10.
                hours = floor(time / 36e5) % 24;
                minutes = floor(time / 6e4) % 60;
                seconds = floor(time / 1e3) % 60;
                milliseconds = time % 1e3;
              } else {
                year = value.getUTCFullYear();
                month = value.getUTCMonth();
                date = value.getUTCDate();
                hours = value.getUTCHours();
                minutes = value.getUTCMinutes();
                seconds = value.getUTCSeconds();
                milliseconds = value.getUTCMilliseconds();
              }
              // Serialize extended years correctly.
              value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                // Months, dates, hours, minutes, and seconds should have two
                // digits; milliseconds should have three.
                "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                // Milliseconds are optional in ES 5.0, but required in 5.1.
                "." + toPaddedString(3, milliseconds) + "Z";
            } else {
              value = null;
            }
          } else if (typeof value.toJSON == "function" && ((className != numberClass && className != stringClass && className != arrayClass) || isProperty.call(value, "toJSON"))) {
            // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
            // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
            // ignores all `toJSON` methods on these objects unless they are
            // defined directly on an instance.
            value = value.toJSON(property);
          }
        }
        if (callback) {
          // If a replacement function was provided, call it to obtain the value
          // for serialization.
          value = callback.call(object, property, value);
        }
        if (value === null) {
          return "null";
        }
        className = getClass.call(value);
        if (className == booleanClass) {
          // Booleans are represented literally.
          return "" + value;
        } else if (className == numberClass) {
          // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
          // `"null"`.
          return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
        } else if (className == stringClass) {
          // Strings are double-quoted and escaped.
          return quote("" + value);
        }
        // Recursively serialize objects and arrays.
        if (typeof value == "object") {
          // Check for cyclic structures. This is a linear search; performance
          // is inversely proportional to the number of unique nested objects.
          for (length = stack.length; length--;) {
            if (stack[length] === value) {
              // Cyclic structures cannot be serialized by `JSON.stringify`.
              throw TypeError();
            }
          }
          // Add the object to the stack of traversed objects.
          stack.push(value);
          results = [];
          // Save the current indentation level and indent one additional level.
          prefix = indentation;
          indentation += whitespace;
          if (className == arrayClass) {
            // Recursively serialize array elements.
            for (index = 0, length = value.length; index < length; index++) {
              element = serialize(index, value, callback, properties, whitespace, indentation, stack);
              results.push(element === undef ? "null" : element);
            }
            result = results.length ? (whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : ("[" + results.join(",") + "]")) : "[]";
          } else {
            // Recursively serialize object members. Members are selected from
            // either a user-specified list of property names, or the object
            // itself.
            forEach(properties || value, function (property) {
              var element = serialize(property, value, callback, properties, whitespace, indentation, stack);
              if (element !== undef) {
                // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                // is not the empty string, let `member` {quote(property) + ":"}
                // be the concatenation of `member` and the `space` character."
                // The "`space` character" refers to the literal space
                // character, not the `space` {width} argument provided to
                // `JSON.stringify`.
                results.push(quote(property) + ":" + (whitespace ? " " : "") + element);
              }
            });
            result = results.length ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
          }
          // Remove the object from the traversed object stack.
          stack.pop();
          return result;
        }
      };

      // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.
      JSON3.stringify = function (source, filter, width) {
        var whitespace, callback, properties, className;
        if (typeof filter == "function" || typeof filter == "object" && filter) {
          if ((className = getClass.call(filter)) == functionClass) {
            callback = filter;
          } else if (className == arrayClass) {
            // Convert the property names array into a makeshift set.
            properties = {};
            for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == stringClass || className == numberClass) && (properties[value] = 1));
          }
        }
        if (width) {
          if ((className = getClass.call(width)) == numberClass) {
            // Convert the `width` to an integer and create a string containing
            // `width` number of space characters.
            if ((width -= width % 1) > 0) {
              for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
            }
          } else if (className == stringClass) {
            whitespace = width.length <= 10 ? width : width.slice(0, 10);
          }
        }
        // Opera <= 7.54u2 discards the values associated with empty string keys
        // (`""`) only if they are used directly within an object member list
        // (e.g., `!("" in { "": 1})`).
        return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", []);
      };
    }

    // Public: Parses a JSON source string.
    if (!has("json-parse")) {
      var fromCharCode = String.fromCharCode;

      // Internal: A map of escaped control characters and their unescaped
      // equivalents.
      var Unescapes = {
        92: "\\",
        34: '"',
        47: "/",
        98: "\b",
        116: "\t",
        110: "\n",
        102: "\f",
        114: "\r"
      };

      // Internal: Stores the parser state.
      var Index, Source;

      // Internal: Resets the parser state and throws a `SyntaxError`.
      var abort = function() {
        Index = Source = null;
        throw SyntaxError();
      };

      // Internal: Returns the next token, or `"$"` if the parser has reached
      // the end of the source string. A token may be a string, number, `null`
      // literal, or Boolean literal.
      var lex = function () {
        var source = Source, length = source.length, value, begin, position, isSigned, charCode;
        while (Index < length) {
          charCode = source.charCodeAt(Index);
          switch (charCode) {
            case 9: case 10: case 13: case 32:
              // Skip whitespace tokens, including tabs, carriage returns, line
              // feeds, and space characters.
              Index++;
              break;
            case 123: case 125: case 91: case 93: case 58: case 44:
              // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
              // the current position.
              value = charIndexBuggy ? source.charAt(Index) : source[Index];
              Index++;
              return value;
            case 34:
              // `"` delimits a JSON string; advance to the next character and
              // begin parsing the string. String tokens are prefixed with the
              // sentinel `@` character to distinguish them from punctuators and
              // end-of-string tokens.
              for (value = "@", Index++; Index < length;) {
                charCode = source.charCodeAt(Index);
                if (charCode < 32) {
                  // Unescaped ASCII control characters (those with a code unit
                  // less than the space character) are not permitted.
                  abort();
                } else if (charCode == 92) {
                  // A reverse solidus (`\`) marks the beginning of an escaped
                  // control character (including `"`, `\`, and `/`) or Unicode
                  // escape sequence.
                  charCode = source.charCodeAt(++Index);
                  switch (charCode) {
                    case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
                      // Revive escaped control characters.
                      value += Unescapes[charCode];
                      Index++;
                      break;
                    case 117:
                      // `\u` marks the beginning of a Unicode escape sequence.
                      // Advance to the first character and validate the
                      // four-digit code point.
                      begin = ++Index;
                      for (position = Index + 4; Index < position; Index++) {
                        charCode = source.charCodeAt(Index);
                        // A valid sequence comprises four hexdigits (case-
                        // insensitive) that form a single hexadecimal value.
                        if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                          // Invalid Unicode escape sequence.
                          abort();
                        }
                      }
                      // Revive the escaped character.
                      value += fromCharCode("0x" + source.slice(begin, Index));
                      break;
                    default:
                      // Invalid escape sequence.
                      abort();
                  }
                } else {
                  if (charCode == 34) {
                    // An unescaped double-quote character marks the end of the
                    // string.
                    break;
                  }
                  charCode = source.charCodeAt(Index);
                  begin = Index;
                  // Optimize for the common case where a string is valid.
                  while (charCode >= 32 && charCode != 92 && charCode != 34) {
                    charCode = source.charCodeAt(++Index);
                  }
                  // Append the string as-is.
                  value += source.slice(begin, Index);
                }
              }
              if (source.charCodeAt(Index) == 34) {
                // Advance to the next character and return the revived string.
                Index++;
                return value;
              }
              // Unterminated string.
              abort();
            default:
              // Parse numbers and literals.
              begin = Index;
              // Advance past the negative sign, if one is specified.
              if (charCode == 45) {
                isSigned = true;
                charCode = source.charCodeAt(++Index);
              }
              // Parse an integer or floating-point value.
              if (charCode >= 48 && charCode <= 57) {
                // Leading zeroes are interpreted as octal literals.
                if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
                  // Illegal octal literal.
                  abort();
                }
                isSigned = false;
                // Parse the integer component.
                for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
                // Floats cannot contain a leading decimal point; however, this
                // case is already accounted for by the parser.
                if (source.charCodeAt(Index) == 46) {
                  position = ++Index;
                  // Parse the decimal component.
                  for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                  if (position == Index) {
                    // Illegal trailing decimal.
                    abort();
                  }
                  Index = position;
                }
                // Parse exponents. The `e` denoting the exponent is
                // case-insensitive.
                charCode = source.charCodeAt(Index);
                if (charCode == 101 || charCode == 69) {
                  charCode = source.charCodeAt(++Index);
                  // Skip past the sign following the exponent, if one is
                  // specified.
                  if (charCode == 43 || charCode == 45) {
                    Index++;
                  }
                  // Parse the exponential component.
                  for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                  if (position == Index) {
                    // Illegal empty exponent.
                    abort();
                  }
                  Index = position;
                }
                // Coerce the parsed value to a JavaScript number.
                return +source.slice(begin, Index);
              }
              // A negative sign may only precede numbers.
              if (isSigned) {
                abort();
              }
              // `true`, `false`, and `null` literals.
              if (source.slice(Index, Index + 4) == "true") {
                Index += 4;
                return true;
              } else if (source.slice(Index, Index + 5) == "false") {
                Index += 5;
                return false;
              } else if (source.slice(Index, Index + 4) == "null") {
                Index += 4;
                return null;
              }
              // Unrecognized token.
              abort();
          }
        }
        // Return the sentinel `$` character if the parser has reached the end
        // of the source string.
        return "$";
      };

      // Internal: Parses a JSON `value` token.
      var get = function (value) {
        var results, hasMembers;
        if (value == "$") {
          // Unexpected end of input.
          abort();
        }
        if (typeof value == "string") {
          if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
            // Remove the sentinel `@` character.
            return value.slice(1);
          }
          // Parse object and array literals.
          if (value == "[") {
            // Parses a JSON array, returning a new JavaScript array.
            results = [];
            for (;; hasMembers || (hasMembers = true)) {
              value = lex();
              // A closing square bracket marks the end of the array literal.
              if (value == "]") {
                break;
              }
              // If the array literal contains elements, the current token
              // should be a comma separating the previous element from the
              // next.
              if (hasMembers) {
                if (value == ",") {
                  value = lex();
                  if (value == "]") {
                    // Unexpected trailing `,` in array literal.
                    abort();
                  }
                } else {
                  // A `,` must separate each array element.
                  abort();
                }
              }
              // Elisions and leading commas are not permitted.
              if (value == ",") {
                abort();
              }
              results.push(get(value));
            }
            return results;
          } else if (value == "{") {
            // Parses a JSON object, returning a new JavaScript object.
            results = {};
            for (;; hasMembers || (hasMembers = true)) {
              value = lex();
              // A closing curly brace marks the end of the object literal.
              if (value == "}") {
                break;
              }
              // If the object literal contains members, the current token
              // should be a comma separator.
              if (hasMembers) {
                if (value == ",") {
                  value = lex();
                  if (value == "}") {
                    // Unexpected trailing `,` in object literal.
                    abort();
                  }
                } else {
                  // A `,` must separate each object member.
                  abort();
                }
              }
              // Leading commas are not permitted, object property names must be
              // double-quoted strings, and a `:` must separate each property
              // name and value.
              if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
                abort();
              }
              results[value.slice(1)] = get(lex());
            }
            return results;
          }
          // Unexpected token encountered.
          abort();
        }
        return value;
      };

      // Internal: Updates a traversed object member.
      var update = function(source, property, callback) {
        var element = walk(source, property, callback);
        if (element === undef) {
          delete source[property];
        } else {
          source[property] = element;
        }
      };

      // Internal: Recursively traverses a parsed JSON object, invoking the
      // `callback` function for each value. This is an implementation of the
      // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
      var walk = function (source, property, callback) {
        var value = source[property], length;
        if (typeof value == "object" && value) {
          // `forEach` can't be used to traverse an array in Opera <= 8.54
          // because its `Object#hasOwnProperty` implementation returns `false`
          // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
          if (getClass.call(value) == arrayClass) {
            for (length = value.length; length--;) {
              update(value, length, callback);
            }
          } else {
            forEach(value, function (property) {
              update(value, property, callback);
            });
          }
        }
        return callback.call(source, property, value);
      };

      // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
      JSON3.parse = function (source, callback) {
        var result, value;
        Index = 0;
        Source = "" + source;
        result = get(lex());
        // If a JSON string contains multiple tokens, it is invalid.
        if (lex() != "$") {
          abort();
        }
        // Reset the parser state.
        Index = Source = null;
        return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result;
      };
    }
  }

  // Export for asynchronous module loaders.
  if (isLoader) {
    define(function () {
      return JSON3;
    });
  }
}(this));

},{}],66:[function(require,module,exports){
module.exports = toArray

function toArray(list, index) {
    var array = []

    index = index || 0

    for (var i = index || 0; i < list.length; i++) {
        array[i - index] = list[i]
    }

    return array
}

},{}],67:[function(require,module,exports){
"use strict";
var __moduleName = "src/js/game";
var pathFinding = require('pathfinding');
var io = require('socket.io-client');
var socket = io('http://127.0.0.1:1337');
var World = require('./world').World;
var polyworld = new World();
polyworld.toBinaryMatrix();
window.addEventListener('polymer-ready', (function(event) {
  var gameStage = document.querySelector('game-stage');
  gameStage.pathFinding = pathFinding;
  gameStage.socket = socket;
  gameStage.world = polyworld.map;
  gameStage.binaryMap = polyworld.binaryMap;
}));


},{"./world":68,"pathfinding":6,"socket.io-client":25}],68:[function(require,module,exports){
"use strict";
var __moduleName = "src/js/world";
var World = function World(map) {
  this.map = [[0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 1, 0, 1, 0, 0, 0, 0, 3, 0, 4, 0, 3, 5, 0, 3, 0, 0, 0], [0, 0, 0, 0, 0, 4, 2, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 3, 0, 3, 1, 1, 0, 4, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
  this.crossableSprites = [0, 3];
};
($traceurRuntime.createClass)(World, {
  isCrossable: function(type) {
    return this.crossableSprites.indexOf(type) !== -1 ? true : false;
  },
  toBinaryMatrix: function() {
    var $__0 = this;
    this.binaryMap = [];
    var toBinary = (function(value) {
      return $__0.isCrossable(value) ? 0 : 1;
    });
    this.map.forEach((function(row) {
      return $__0.binaryMap.push(row.map(toBinary));
    }));
  }
}, {});
module.exports = {
  get World() {
    return World;
  },
  __esModule: true
};


},{}]},{},[5,67])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvaW5kZXguanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9saWIvYjY0LmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9pZWVlNzU0L2luZGV4LmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvZXM2aWZ5L25vZGVfbW9kdWxlcy90cmFjZXVyL2Jpbi90cmFjZXVyLXJ1bnRpbWUuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9pbmRleC5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL25vZGVfbW9kdWxlcy9oZWFwL2luZGV4LmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvbm9kZV9tb2R1bGVzL2hlYXAvbGliL2hlYXAuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9zcmMvUGF0aEZpbmRpbmcuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9zcmMvY29yZS9HcmlkLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvc3JjL2NvcmUvSGV1cmlzdGljLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvc3JjL2NvcmUvTm9kZS5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL3NyYy9jb3JlL1V0aWwuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9zcmMvZmluZGVycy9BU3RhckZpbmRlci5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL3NyYy9maW5kZXJzL0Jlc3RGaXJzdEZpbmRlci5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL3NyYy9maW5kZXJzL0JpQVN0YXJGaW5kZXIuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9wYXRoZmluZGluZy9zcmMvZmluZGVycy9CaUJlc3RGaXJzdEZpbmRlci5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL3NyYy9maW5kZXJzL0JpQnJlYWR0aEZpcnN0RmluZGVyLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvc3JjL2ZpbmRlcnMvQmlEaWprc3RyYUZpbmRlci5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL3NyYy9maW5kZXJzL0JyZWFkdGhGaXJzdEZpbmRlci5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL3NyYy9maW5kZXJzL0RpamtzdHJhRmluZGVyLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvcGF0aGZpbmRpbmcvc3JjL2ZpbmRlcnMvSURBU3RhckZpbmRlci5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL3NyYy9maW5kZXJzL0p1bXBQb2ludEZpbmRlci5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3BhdGhmaW5kaW5nL3NyYy9maW5kZXJzL09ydGhvZ29uYWxKdW1wUG9pbnRGaW5kZXIuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L2luZGV4LmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9saWIvaW5kZXguanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L2xpYi9tYW5hZ2VyLmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9saWIvb24uanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L2xpYi9zb2NrZXQuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L2xpYi91cmwuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L25vZGVfbW9kdWxlcy9iaW5kL2luZGV4LmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9ub2RlX21vZHVsZXMvZGVidWcvZGVidWcuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L25vZGVfbW9kdWxlcy9lbWl0dGVyL2luZGV4LmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9pbmRleC5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3NvY2tldC5pby1jbGllbnQvbm9kZV9tb2R1bGVzL2VuZ2luZS5pby1jbGllbnQvbGliL2luZGV4LmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9saWIvc29ja2V0LmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9saWIvdHJhbnNwb3J0LmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9saWIvdHJhbnNwb3J0cy9pbmRleC5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3NvY2tldC5pby1jbGllbnQvbm9kZV9tb2R1bGVzL2VuZ2luZS5pby1jbGllbnQvbGliL3RyYW5zcG9ydHMvcG9sbGluZy1qc29ucC5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3NvY2tldC5pby1jbGllbnQvbm9kZV9tb2R1bGVzL2VuZ2luZS5pby1jbGllbnQvbGliL3RyYW5zcG9ydHMvcG9sbGluZy14aHIuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tY2xpZW50L2xpYi90cmFuc3BvcnRzL3BvbGxpbmcuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tY2xpZW50L2xpYi90cmFuc3BvcnRzL3dlYnNvY2tldC5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3NvY2tldC5pby1jbGllbnQvbm9kZV9tb2R1bGVzL2VuZ2luZS5pby1jbGllbnQvbGliL3htbGh0dHByZXF1ZXN0LmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9ub2RlX21vZHVsZXMvZW5naW5lLmlvLXBhcnNlci9saWIvYnJvd3Nlci5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3NvY2tldC5pby1jbGllbnQvbm9kZV9tb2R1bGVzL2VuZ2luZS5pby1jbGllbnQvbm9kZV9tb2R1bGVzL2VuZ2luZS5pby1wYXJzZXIvbGliL2tleXMuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tY2xpZW50L25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tcGFyc2VyL25vZGVfbW9kdWxlcy9hZnRlci9pbmRleC5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3NvY2tldC5pby1jbGllbnQvbm9kZV9tb2R1bGVzL2VuZ2luZS5pby1jbGllbnQvbm9kZV9tb2R1bGVzL2VuZ2luZS5pby1wYXJzZXIvbm9kZV9tb2R1bGVzL2FycmF5YnVmZmVyLnNsaWNlL2luZGV4LmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9ub2RlX21vZHVsZXMvZW5naW5lLmlvLXBhcnNlci9ub2RlX21vZHVsZXMvYmFzZTY0LWFycmF5YnVmZmVyL2xpYi9iYXNlNjQtYXJyYXlidWZmZXIuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tY2xpZW50L25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tcGFyc2VyL25vZGVfbW9kdWxlcy9ibG9iL2luZGV4LmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9ub2RlX21vZHVsZXMvZW5naW5lLmlvLXBhcnNlci9ub2RlX21vZHVsZXMvdXRmOC91dGY4LmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9ub2RlX21vZHVsZXMvaGFzLWNvcnMvaW5kZXguanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tY2xpZW50L25vZGVfbW9kdWxlcy9oYXMtY29ycy9ub2RlX21vZHVsZXMvZ2xvYmFsL2luZGV4LmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9ub2RlX21vZHVsZXMvZW5naW5lLmlvLWNsaWVudC9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3NvY2tldC5pby1jbGllbnQvbm9kZV9tb2R1bGVzL2VuZ2luZS5pby1jbGllbnQvbm9kZV9tb2R1bGVzL3BhcnNlanNvbi9pbmRleC5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3NvY2tldC5pby1jbGllbnQvbm9kZV9tb2R1bGVzL2VuZ2luZS5pby1jbGllbnQvbm9kZV9tb2R1bGVzL3BhcnNlcXMvaW5kZXguanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L25vZGVfbW9kdWxlcy9lbmdpbmUuaW8tY2xpZW50L25vZGVfbW9kdWxlcy93cy9saWIvYnJvd3Nlci5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3NvY2tldC5pby1jbGllbnQvbm9kZV9tb2R1bGVzL2hhcy1iaW5hcnktZGF0YS9pbmRleC5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3NvY2tldC5pby1jbGllbnQvbm9kZV9tb2R1bGVzL2hhcy1iaW5hcnktZGF0YS9ub2RlX21vZHVsZXMvaXNhcnJheS9pbmRleC5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3NvY2tldC5pby1jbGllbnQvbm9kZV9tb2R1bGVzL2luZGV4b2YvaW5kZXguanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L25vZGVfbW9kdWxlcy9vYmplY3QtY29tcG9uZW50L2luZGV4LmpzIiwiL2hvbWUveWFtYWZha3RvcnkvV2ViZGV2L3BvbHltZXItZ2FtZS9ub2RlX21vZHVsZXMvc29ja2V0LmlvLWNsaWVudC9ub2RlX21vZHVsZXMvcGFyc2V1cmkvaW5kZXguanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tcGFyc2VyL2JpbmFyeS5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvbm9kZV9tb2R1bGVzL3NvY2tldC5pby1jbGllbnQvbm9kZV9tb2R1bGVzL3NvY2tldC5pby1wYXJzZXIvaW5kZXguanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tcGFyc2VyL25vZGVfbW9kdWxlcy9qc29uMy9saWIvanNvbjMuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L25vZGVfbW9kdWxlcy90by1hcnJheS9pbmRleC5qcyIsIi9ob21lL3lhbWFmYWt0b3J5L1dlYmRldi9wb2x5bWVyLWdhbWUvc3JjL2pzL2dhbWUuanMiLCIvaG9tZS95YW1hZmFrdG9yeS9XZWJkZXYvcG9seW1lci1nYW1lL3NyYy9qcy93b3JsZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzduQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzl6Q0E7O0FBQUEsQ0FBQSxLQUFNLFFBQVEsRUFBRyxDQUFBLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0NBQzlDOzs7QUNEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pYQTs7QUFBQSxDQUFBLEtBQU0sUUFBUSxFQUFHO0FBQ2IsQ0FBQSxPQUFNLENBQW1CLENBQUEsT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUN4QyxDQUFBLE9BQU0sQ0FBbUIsQ0FBQSxPQUFPLENBQUMsYUFBYSxDQUFDO0FBQy9DLENBQUEsT0FBTSxD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QUFDLENBQUMsRUFBRyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUEsS0FBRSxFQUFHLEtBQUksQ0FBQztHQUNiO0FBRUQsQ0FGQyxLQUVHLElBQUksYUFBYSxDQUFDLENBQUMsRUFBRyxFQUFDLENBQUUsRUFBQyxDQUFDLENBQUU7QUFDN0IsQ0FBQSxZQUFTLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFHLEVBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQSxLQUFFLEVBQUcsS0FBSSxDQUFDO0dBQ2I7QUFFRCxDQUZDLEtBRUcsQ0FBQyxhQUFhLENBQUU7Q0FDaEIsU0FBTyxVQUFTLENBQUM7R0FDcEI7QUFFRCxDQUZDLEtBRUcsZ0JBQWdCLENBQUU7QUFDbEIsQ0FBQSxLQUFFLEVBQUcsQ0FBQSxFQUFFLEdBQUksR0FBRSxDQUFDO0FBQ2QsQ0FBQSxLQUFFLEVBQUcsQ0FBQSxFQUFFLEdBQUksR0FBRSxDQUFDO0FBQ2QsQ0FBQSxLQUFFLEVBQUcsQ0FBQSxFQUFFLEdBQUksR0FBRSxDQUFDO0FBQ2QsQ0FBQSxLQUFFLEVBQUcsQ0FBQSxFQUFFLEdBQUksR0FBRSxDQUFDO0dBQ2pCLEtBQU07QUFDSCxDQUFBLEtBQUUsRUFBRyxDQUFBLEVBQUUsR0FBSSxHQUFFLENBQUM7QUFDZCxDQUFBLEtBQUUsRUFBRyxDQUFBLEVBQUUsR0FBSSxHQUFFLENBQUM7QUFDZCxDQUFBLEtBQUUsRUFBRyxDQUFBLEVBQUUsR0FBSSxHQUFFLENBQUM7QUFDZCxDQUFBLEtBQUUsRUFBRyxDQUFBLEVBQUUsR0FBSSxHQUFFLENBQUM7R0FDakI7QUFHRCxDQUhDLEtBR0csRUFBRSxHQUFJLENBQUEsSUFBSSxhQUFhLENBQUMsQ0FBQyxFQUFHLEVBQUMsQ0FBRSxDQUFBLENBQUMsRUFBRyxFQUFDLENBQUMsQ0FBRTtBQUN2QyxDQUFBLFlBQVMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUcsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFHLEVBQUMs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Q00sV0FBVyxFQUFHLFdBQVUsQ0FBQztDQVNoQyxPQUFTLGFBQVksQ0FBQyxJQUFJLENBQUUsQ0FBQSxJQUFJLENBQUU7QUFDMUIsQ0FBSixJQUFJLENBQUEsR0FBRyxFQUFHLENBQUEsSUFBSSxPQUFPO0FBQ2pCLENBQUEsT0FBRSxFQUFHLENBQUEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNmLENBQUEsT0FBRSxFQUFHLENBQUEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNmLENBQUEsT0FBRSxFQUFHLENBQUEsSUFBSSxDQUFDLEdBQUcsRUFBRyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckIsQ0FBQSxPQUFFLEVBQUcsQ0FBQSxJQUFJLENBQUMsR0FBRyxFQUFHLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQixDQUFBLE9BQUU7QUFBRSxDQUFBLE9BQUU7QUFDTixDQUFBLE9BQUU7QUFBRSxDQUFBLE9BQUU7QUFDTixDQUFBLE9BQUU7QUFBRSxDQUFBLE9BQUU7QUFDTixDQUFBLFlBQU87QUFDUCxDQUFBLE1BQUM7QUFBRSxDQUFBLE1BQUM7QUFBRSxDQUFBLFVBQUs7QUFBRSxDQUFBLFNBQUk7QUFBRSxDQUFBLGNBQVM7QUFBRSxDQUFBLFlBQU8sQ0FBQztBQUUxQyxDQUFBLEdBQUUsRUFBRyxHQUFFLENBQUM7QUFDUixDQUFBLEdBQUUsRUFBRyxHQUFFLENBQUM7QUFDUixDQUFBLEdBQUUsRUFBRyxDQUFBLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFBLEdBQUUsRUFBRyxDQUFBLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFBLFFBQU8sRUFBRyxFQUFDLENBQUMsRUFBRSxDQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUM7Q0FFckIsTUFBSyxDQUFDLEVBQUcsRUFBQyxDQUFFLENBQUEsQ0FBQyxFQUFHLElBQUcsQ0FBRSxHQUFFLENBQUMsQ0FB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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ppQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDelhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzcxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTs7QUFBSSxDQUFKLEVBQUksQ0FBQSxXQUFXLEVBQUcsQ0FBQSxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFHckMsQ0FBSixFQUFJLENBQUEsRUFBRSxFQUFHLENBQUEsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDakMsQ0FBSixFQUFJLENBQUEsTUFBTSxFQUFHLENBQUEsRUFBRSxDQUFDLHVCQUF1QixDQUFDLENBQUM7b0JBR3JCLFNBQVM7QUFHekIsQ0FBSixFQUFJLENBQUEsU0FBUyxFQUFHLElBQUksTUFBSyxFQUFFLENBQUM7QUFHNUIsQ0FBQSxRQUFTLGVBQWUsRUFBRSxDQUFDO0FBRzNCLENBQUEsS0FBTSxpQkFBaUIsQ0FBQyxlQUFlLFlBQ3JDLEtBQUssQ0FBSTtBQUVILENBQUosSUFBSSxDQUFBLFNBQVMsRUFBRyxDQUFBLFFBQVEsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBRXJELENBQUEsVUFBUyxZQUFZLEVBQUcsWUFBVyxDQUFDO0FBRXBDLENBQUEsVUFBUyxPQUFPLEVBQUcsT0FBTSxDQUFDO0FBRTFCLENBQUEsVUFBUyxNQUFNLEVBQUcsQ0FBQSxTQUFTLElBQUksQ0FBQztBQUVoQyxDQUFBLFVBQVMsVUFBVSxFQUFHLENBQUEsU0FBUyxVQUFVLENBQUM7Q0FDM0MsRUFBQyxDQUFDO0NBQ0w7OztBQzlCQTs7V0FBTyxTQUFNLE1BQUssQ0FFSixHQUFHLENBQUU7QUFFZixDQUFBLEtBQUksSUFBSSxFQUFHLEVBQ1QsQ0FBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM1RCxFQUFDLENBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUMsQ0FDNUQsRUFBQyxDQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFDLENBQzVELEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBRSxFQUFDLENBQUUsRUFBQyxDQUFFLEVBQUMsQ0FBQyxDQUM3RCxDQUFDO0FBRUYsQ0FBQSxLQUFJLGlCQUFpQixFQUFHLEVBQUMsQ0FBQyxDQUFFLEVBQUMsQ0FBQyxDQUFDO0NBQ2hDOztDQUdELFlBQVcsQ0FBWCxVQUFZLElBQUksQ0FBRTtDQUNoQixTQUFPLENBQUEsSUFBSSxpQkFBaUIsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBLEdBQUssRUFBQyxDQUFDLENBQUEsQ0FBRyxLQUFJLEVBQUcsTUFBSyxDQUFDO0dBQ2xFO0NBR0QsZUFBYyxDQUFkLFVBQWU7O0FBQ2IsQ0FBQSxPQUFJLFVBQVUsRUFBRyxHQUFFLENBQUM7QUFDaEIsQ0FBSixNQUFJLENBQUEsUUFBUSxhQUFHLEtBQUs7WUFBSSxDQUFBLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFBLENBQUcsRUFBQyxFQUFHLEVBQUM7TUFBQSxDQUFDO0FBQ3hELENBQUEsT0FBSSxJQUFJLFFBQVEsV0FBQyxHQUFHO1lBQUksQ0FBQSxjQUFjLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztPQUFDLENBQUM7R0FDakU7Ozs7Ozs7O0NBR0giLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTJcblxuLyoqXG4gKiBJZiBgQnVmZmVyLl91c2VUeXBlZEFycmF5c2A6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBVc2UgT2JqZWN0IGltcGxlbWVudGF0aW9uIChjb21wYXRpYmxlIGRvd24gdG8gSUU2KVxuICovXG5CdWZmZXIuX3VzZVR5cGVkQXJyYXlzID0gKGZ1bmN0aW9uICgpIHtcbiAgLy8gRGV0ZWN0IGlmIGJyb3dzZXIgc3VwcG9ydHMgVHlwZWQgQXJyYXlzLiBTdXBwb3J0ZWQgYnJvd3NlcnMgYXJlIElFIDEwKywgRmlyZWZveCA0KyxcbiAgLy8gQ2hyb21lIDcrLCBTYWZhcmkgNS4xKywgT3BlcmEgMTEuNissIGlPUyA0LjIrLiBJZiB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IGFkZGluZ1xuICAvLyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YCBpbnN0YW5jZXMsIHRoZW4gdGhhdCdzIHRoZSBzYW1lIGFzIG5vIGBVaW50OEFycmF5YCBzdXBwb3J0XG4gIC8vIGJlY2F1c2Ugd2UgbmVlZCB0byBiZSBhYmxlIHRvIGFkZCBhbGwgdGhlIG5vZGUgQnVmZmVyIEFQSSBtZXRob2RzLiBUaGlzIGlzIGFuIGlzc3VlXG4gIC8vIGluIEZpcmVmb3ggNC0yOS4gTm93IGZpeGVkOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzhcbiAgdHJ5IHtcbiAgICB2YXIgYnVmID0gbmV3IEFycmF5QnVmZmVyKDApXG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KGJ1ZilcbiAgICBhcnIuZm9vID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfVxuICAgIHJldHVybiA0MiA9PT0gYXJyLmZvbygpICYmXG4gICAgICAgIHR5cGVvZiBhcnIuc3ViYXJyYXkgPT09ICdmdW5jdGlvbicgLy8gQ2hyb21lIDktMTAgbGFjayBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufSkoKVxuXG4vKipcbiAqIENsYXNzOiBCdWZmZXJcbiAqID09PT09PT09PT09PT1cbiAqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGFyZSBhdWdtZW50ZWRcbiAqIHdpdGggZnVuY3Rpb24gcHJvcGVydGllcyBmb3IgYWxsIHRoZSBub2RlIGBCdWZmZXJgIEFQSSBmdW5jdGlvbnMuIFdlIHVzZVxuICogYFVpbnQ4QXJyYXlgIHNvIHRoYXQgc3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXQgcmV0dXJuc1xuICogYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogQnkgYXVnbWVudGluZyB0aGUgaW5zdGFuY2VzLCB3ZSBjYW4gYXZvaWQgbW9kaWZ5aW5nIHRoZSBgVWludDhBcnJheWBcbiAqIHByb3RvdHlwZS5cbiAqL1xuZnVuY3Rpb24gQnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKVxuICAgIHJldHVybiBuZXcgQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pXG5cbiAgdmFyIHR5cGUgPSB0eXBlb2Ygc3ViamVjdFxuXG4gIC8vIFdvcmthcm91bmQ6IG5vZGUncyBiYXNlNjQgaW1wbGVtZW50YXRpb24gYWxsb3dzIGZvciBub24tcGFkZGVkIHN0cmluZ3NcbiAgLy8gd2hpbGUgYmFzZTY0LWpzIGRvZXMgbm90LlxuICBpZiAoZW5jb2RpbmcgPT09ICdiYXNlNjQnICYmIHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgc3ViamVjdCA9IHN0cmluZ3RyaW0oc3ViamVjdClcbiAgICB3aGlsZSAoc3ViamVjdC5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgICBzdWJqZWN0ID0gc3ViamVjdCArICc9J1xuICAgIH1cbiAgfVxuXG4gIC8vIEZpbmQgdGhlIGxlbmd0aFxuICB2YXIgbGVuZ3RoXG4gIGlmICh0eXBlID09PSAnbnVtYmVyJylcbiAgICBsZW5ndGggPSBjb2VyY2Uoc3ViamVjdClcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmluZycpXG4gICAgbGVuZ3RoID0gQnVmZmVyLmJ5dGVMZW5ndGgoc3ViamVjdCwgZW5jb2RpbmcpXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnKVxuICAgIGxlbmd0aCA9IGNvZXJjZShzdWJqZWN0Lmxlbmd0aCkgLy8gYXNzdW1lIHRoYXQgb2JqZWN0IGlzIGFycmF5LWxpa2VcbiAgZWxzZVxuICAgIHRocm93IG5ldyBFcnJvcignRmlyc3QgYXJndW1lbnQgbmVlZHMgdG8gYmUgYSBudW1iZXIsIGFycmF5IG9yIHN0cmluZy4nKVxuXG4gIHZhciBidWZcbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICAvLyBQcmVmZXJyZWQ6IFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgYnVmID0gQnVmZmVyLl9hdWdtZW50KG5ldyBVaW50OEFycmF5KGxlbmd0aCkpXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBUSElTIGluc3RhbmNlIG9mIEJ1ZmZlciAoY3JlYXRlZCBieSBgbmV3YClcbiAgICBidWYgPSB0aGlzXG4gICAgYnVmLmxlbmd0aCA9IGxlbmd0aFxuICAgIGJ1Zi5faXNCdWZmZXIgPSB0cnVlXG4gIH1cblxuICB2YXIgaVxuICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cyAmJiB0eXBlb2Ygc3ViamVjdC5ieXRlTGVuZ3RoID09PSAnbnVtYmVyJykge1xuICAgIC8vIFNwZWVkIG9wdGltaXphdGlvbiAtLSB1c2Ugc2V0IGlmIHdlJ3JlIGNvcHlpbmcgZnJvbSBhIHR5cGVkIGFycmF5XG4gICAgYnVmLl9zZXQoc3ViamVjdClcbiAgfSBlbHNlIGlmIChpc0FycmF5aXNoKHN1YmplY3QpKSB7XG4gICAgLy8gVHJlYXQgYXJyYXktaXNoIG9iamVjdHMgYXMgYSBieXRlIGFycmF5XG4gICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSkge1xuICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKVxuICAgICAgICBidWZbaV0gPSBzdWJqZWN0LnJlYWRVSW50OChpKVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspXG4gICAgICAgIGJ1ZltpXSA9ICgoc3ViamVjdFtpXSAlIDI1NikgKyAyNTYpICUgMjU2XG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgYnVmLndyaXRlKHN1YmplY3QsIDAsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdudW1iZXInICYmICFCdWZmZXIuX3VzZVR5cGVkQXJyYXlzICYmICFub1plcm8pIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGJ1ZltpXSA9IDBcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnVmXG59XG5cbi8vIFNUQVRJQyBNRVRIT0RTXG4vLyA9PT09PT09PT09PT09PVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAncmF3JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gKGIpIHtcbiAgcmV0dXJuICEhKGIgIT09IG51bGwgJiYgYiAhPT0gdW5kZWZpbmVkICYmIGIuX2lzQnVmZmVyKVxufVxuXG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGZ1bmN0aW9uIChzdHIsIGVuY29kaW5nKSB7XG4gIHZhciByZXRcbiAgc3RyID0gc3RyLnRvU3RyaW5nKClcbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAvIDJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAncmF3JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IGJhc2U2NFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggKiAyXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcnKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIChsaXN0LCB0b3RhbExlbmd0aCkge1xuICBhc3NlcnQoaXNBcnJheShsaXN0KSwgJ1VzYWdlOiBCdWZmZXIuY29uY2F0KGxpc3RbLCBsZW5ndGhdKScpXG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoMClcbiAgfSBlbHNlIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBsaXN0WzBdXG4gIH1cblxuICB2YXIgaVxuICBpZiAodG90YWxMZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIHRvdGFsTGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0b3RhbExlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHRvdGFsTGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXVxuICAgIGl0ZW0uY29weShidWYsIHBvcylcbiAgICBwb3MgKz0gaXRlbS5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbkJ1ZmZlci5jb21wYXJlID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgYXNzZXJ0KEJ1ZmZlci5pc0J1ZmZlcihhKSAmJiBCdWZmZXIuaXNCdWZmZXIoYiksICdBcmd1bWVudHMgbXVzdCBiZSBCdWZmZXJzJylcbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBNYXRoLm1pbih4LCB5KTsgaSA8IGxlbiAmJiBhW2ldID09PSBiW2ldOyBpKyspIHt9XG4gIGlmIChpICE9PSBsZW4pIHtcbiAgICB4ID0gYVtpXVxuICAgIHkgPSBiW2ldXG4gIH1cbiAgaWYgKHggPCB5KSB7XG4gICAgcmV0dXJuIC0xXG4gIH1cbiAgaWYgKHkgPCB4KSB7XG4gICAgcmV0dXJuIDFcbiAgfVxuICByZXR1cm4gMFxufVxuXG4vLyBCVUZGRVIgSU5TVEFOQ0UgTUVUSE9EU1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBhc3NlcnQoc3RyTGVuICUgMiA9PT0gMCwgJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBieXRlID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGFzc2VydCghaXNOYU4oYnl0ZSksICdJbnZhbGlkIGhleCBzdHJpbmcnKVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IGJ5dGVcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIGFzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBiaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gdXRmMTZsZVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIFN1cHBvcnQgYm90aCAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpXG4gIC8vIGFuZCB0aGUgbGVnYWN5IChzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBpZiAoIWlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7ICAvLyBsZWdhY3lcbiAgICB2YXIgc3dhcCA9IGVuY29kaW5nXG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBvZmZzZXQgPSBsZW5ndGhcbiAgICBsZW5ndGggPSBzd2FwXG4gIH1cblxuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBoZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXQgPSB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYXNjaWknOlxuICAgICAgcmV0ID0gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gYmluYXJ5V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXQgPSB1dGYxNmxlV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuICBzdGFydCA9IE51bWJlcihzdGFydCkgfHwgMFxuICBlbmQgPSAoZW5kID09PSB1bmRlZmluZWQpID8gc2VsZi5sZW5ndGggOiBOdW1iZXIoZW5kKVxuXG4gIC8vIEZhc3RwYXRoIGVtcHR5IHN0cmluZ3NcbiAgaWYgKGVuZCA9PT0gc3RhcnQpXG4gICAgcmV0dXJuICcnXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IGhleFNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBhc2NpaVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBiaW5hcnlTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gYmFzZTY0U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IHV0ZjE2bGVTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gKGIpIHtcbiAgYXNzZXJ0KEJ1ZmZlci5pc0J1ZmZlcihiKSwgJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYikgPT09IDBcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gKGIpIHtcbiAgYXNzZXJ0KEJ1ZmZlci5pc0J1ZmZlcihiKSwgJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYilcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gKHRhcmdldCwgdGFyZ2V0X3N0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIHZhciBzb3VyY2UgPSB0aGlzXG5cbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKCF0YXJnZXRfc3RhcnQpIHRhcmdldF9zdGFydCA9IDBcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVyblxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCBzb3VyY2UubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGFzc2VydChlbmQgPj0gc3RhcnQsICdzb3VyY2VFbmQgPCBzb3VyY2VTdGFydCcpXG4gIGFzc2VydCh0YXJnZXRfc3RhcnQgPj0gMCAmJiB0YXJnZXRfc3RhcnQgPCB0YXJnZXQubGVuZ3RoLFxuICAgICAgJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoc3RhcnQgPj0gMCAmJiBzdGFydCA8IHNvdXJjZS5sZW5ndGgsICdzb3VyY2VTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgYXNzZXJ0KGVuZCA+PSAwICYmIGVuZCA8PSBzb3VyY2UubGVuZ3RoLCAnc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aClcbiAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCA8IGVuZCAtIHN0YXJ0KVxuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgKyBzdGFydFxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuXG4gIGlmIChsZW4gPCAxMDAgfHwgIUJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldF9zdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGFyZ2V0Ll9zZXQodGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLCB0YXJnZXRfc3RhcnQpXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXMgPSAnJ1xuICB2YXIgdG1wID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgaWYgKGJ1ZltpXSA8PSAweDdGKSB7XG4gICAgICByZXMgKz0gZGVjb2RlVXRmOENoYXIodG1wKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICAgICAgdG1wID0gJydcbiAgICB9IGVsc2Uge1xuICAgICAgdG1wICs9ICclJyArIGJ1ZltpXS50b1N0cmluZygxNilcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzICsgZGVjb2RlVXRmOENoYXIodG1wKVxufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGJpbmFyeVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgcmV0dXJuIGFzY2lpU2xpY2UoYnVmLCBzdGFydCwgZW5kKVxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgYnl0ZXNbaSArIDFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IGNsYW1wKHN0YXJ0LCBsZW4sIDApXG4gIGVuZCA9IGNsYW1wKGVuZCwgbGVuLCBsZW4pXG5cbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICByZXR1cm4gQnVmZmVyLl9hdWdtZW50KHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCkpXG4gIH0gZWxzZSB7XG4gICAgdmFyIHNsaWNlTGVuID0gZW5kIC0gc3RhcnRcbiAgICB2YXIgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkLCB0cnVlKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICAgIHJldHVybiBuZXdCdWZcbiAgfVxufVxuXG4vLyBgZ2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuZ2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy5yZWFkVUludDgob2Zmc2V0KVxufVxuXG4vLyBgc2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuZnVuY3Rpb24gcmVhZFVJbnQxNiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWxcbiAgaWYgKGxpdHRsZUVuZGlhbikge1xuICAgIHZhbCA9IGJ1ZltvZmZzZXRdXG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDFdIDw8IDhcbiAgfSBlbHNlIHtcbiAgICB2YWwgPSBidWZbb2Zmc2V0XSA8PCA4XG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDFdXG4gIH1cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiByZWFkVUludDE2KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWRVSW50MTYodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHJlYWRVSW50MzIgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsXG4gIGlmIChsaXR0bGVFbmRpYW4pIHtcbiAgICBpZiAob2Zmc2V0ICsgMiA8IGxlbilcbiAgICAgIHZhbCA9IGJ1ZltvZmZzZXQgKyAyXSA8PCAxNlxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXSA8PCA4XG4gICAgdmFsIHw9IGJ1ZltvZmZzZXRdXG4gICAgaWYgKG9mZnNldCArIDMgPCBsZW4pXG4gICAgICB2YWwgPSB2YWwgKyAoYnVmW29mZnNldCArIDNdIDw8IDI0ID4+PiAwKVxuICB9IGVsc2Uge1xuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsID0gYnVmW29mZnNldCArIDFdIDw8IDE2XG4gICAgaWYgKG9mZnNldCArIDIgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDJdIDw8IDhcbiAgICBpZiAob2Zmc2V0ICsgMyA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgM11cbiAgICB2YWwgPSB2YWwgKyAoYnVmW29mZnNldF0gPDwgMjQgPj4+IDApXG4gIH1cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiByZWFkVUludDMyKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWRVSW50MzIodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHZhciBuZWcgPSB0aGlzW29mZnNldF0gJiAweDgwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5mdW5jdGlvbiByZWFkSW50MTYgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsID0gcmVhZFVJbnQxNihidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCB0cnVlKVxuICB2YXIgbmVnID0gdmFsICYgMHg4MDAwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmZmYgLSB2YWwgKyAxKSAqIC0xXG4gIGVsc2VcbiAgICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gcmVhZEludDE2KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gcmVhZEludDE2KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiByZWFkSW50MzIgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsID0gcmVhZFVJbnQzMihidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCB0cnVlKVxuICB2YXIgbmVnID0gdmFsICYgMHg4MDAwMDAwMFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZmZmZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiByZWFkSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiByZWFkSW50MzIodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHJlYWRGbG9hdCAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWRGbG9hdCh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWRGbG9hdCh0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gcmVhZERvdWJsZSAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgNyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiByZWFkRG91YmxlKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWREb3VibGUodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmKVxuICB9XG5cbiAgaWYgKG9mZnNldCA+PSB0aGlzLmxlbmd0aCkgcmV0dXJuXG5cbiAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuZnVuY3Rpb24gd3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihsZW4gLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgICAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmZmZmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihsZW4gLSBvZmZzZXQsIDQpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgKHZhbHVlID4+PiAobGl0dGxlRW5kaWFuID8gaSA6IDMgLSBpKSAqIDgpICYgMHhmZlxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmLCAtMHg4MClcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgdGhpcy53cml0ZVVJbnQ4KHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgdGhpcy53cml0ZVVJbnQ4KDB4ZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbm9Bc3NlcnQpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbmZ1bmN0aW9uIHdyaXRlSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZmZmLCAtMHg4MDAwKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgd3JpdGVVSW50MTYoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgd3JpdGVVSW50MTYoYnVmLCAweGZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIHdyaXRlVUludDMyKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbiAgZWxzZVxuICAgIHdyaXRlVUludDMyKGJ1ZiwgMHhmZmZmZmZmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZklFRUU3NTQodmFsdWUsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDcgPCBidWYubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZklFRUU3NTQodmFsdWUsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgYXNzZXJ0KGVuZCA+PSBzdGFydCwgJ2VuZCA8IHN0YXJ0JylcblxuICAvLyBGaWxsIDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVyblxuICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIGFzc2VydChzdGFydCA+PSAwICYmIHN0YXJ0IDwgdGhpcy5sZW5ndGgsICdzdGFydCBvdXQgb2YgYm91bmRzJylcbiAgYXNzZXJ0KGVuZCA+PSAwICYmIGVuZCA8PSB0aGlzLmxlbmd0aCwgJ2VuZCBvdXQgb2YgYm91bmRzJylcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSB2YWx1ZVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSB1dGY4VG9CeXRlcyh2YWx1ZS50b1N0cmluZygpKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBvdXQgPSBbXVxuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIG91dFtpXSA9IHRvSGV4KHRoaXNbaV0pXG4gICAgaWYgKGkgPT09IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMpIHtcbiAgICAgIG91dFtpICsgMV0gPSAnLi4uJ1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cbiAgcmV0dXJuICc8QnVmZmVyICcgKyBvdXQuam9pbignICcpICsgJz4nXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBgQXJyYXlCdWZmZXJgIHdpdGggdGhlICpjb3BpZWQqIG1lbW9yeSBvZiB0aGUgYnVmZmVyIGluc3RhbmNlLlxuICogQWRkZWQgaW4gTm9kZSAwLjEyLiBPbmx5IGF2YWlsYWJsZSBpbiBicm93c2VycyB0aGF0IHN1cHBvcnQgQXJyYXlCdWZmZXIuXG4gKi9cbkJ1ZmZlci5wcm90b3R5cGUudG9BcnJheUJ1ZmZlciA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgICByZXR1cm4gKG5ldyBCdWZmZXIodGhpcykpLmJ1ZmZlclxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5sZW5ndGgpXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYnVmLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKSB7XG4gICAgICAgIGJ1ZltpXSA9IHRoaXNbaV1cbiAgICAgIH1cbiAgICAgIHJldHVybiBidWYuYnVmZmVyXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignQnVmZmVyLnRvQXJyYXlCdWZmZXIgbm90IHN1cHBvcnRlZCBpbiB0aGlzIGJyb3dzZXInKVxuICB9XG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIEJQID0gQnVmZmVyLnByb3RvdHlwZVxuXG4vKipcbiAqIEF1Z21lbnQgYSBVaW50OEFycmF5ICppbnN0YW5jZSogKG5vdCB0aGUgVWludDhBcnJheSBjbGFzcyEpIHdpdGggQnVmZmVyIG1ldGhvZHNcbiAqL1xuQnVmZmVyLl9hdWdtZW50ID0gZnVuY3Rpb24gKGFycikge1xuICBhcnIuX2lzQnVmZmVyID0gdHJ1ZVxuXG4gIC8vIHNhdmUgcmVmZXJlbmNlIHRvIG9yaWdpbmFsIFVpbnQ4QXJyYXkgZ2V0L3NldCBtZXRob2RzIGJlZm9yZSBvdmVyd3JpdGluZ1xuICBhcnIuX2dldCA9IGFyci5nZXRcbiAgYXJyLl9zZXQgPSBhcnIuc2V0XG5cbiAgLy8gZGVwcmVjYXRlZCwgd2lsbCBiZSByZW1vdmVkIGluIG5vZGUgMC4xMytcbiAgYXJyLmdldCA9IEJQLmdldFxuICBhcnIuc2V0ID0gQlAuc2V0XG5cbiAgYXJyLndyaXRlID0gQlAud3JpdGVcbiAgYXJyLnRvU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvTG9jYWxlU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvSlNPTiA9IEJQLnRvSlNPTlxuICBhcnIuZXF1YWxzID0gQlAuZXF1YWxzXG4gIGFyci5jb21wYXJlID0gQlAuY29tcGFyZVxuICBhcnIuY29weSA9IEJQLmNvcHlcbiAgYXJyLnNsaWNlID0gQlAuc2xpY2VcbiAgYXJyLnJlYWRVSW50OCA9IEJQLnJlYWRVSW50OFxuICBhcnIucmVhZFVJbnQxNkxFID0gQlAucmVhZFVJbnQxNkxFXG4gIGFyci5yZWFkVUludDE2QkUgPSBCUC5yZWFkVUludDE2QkVcbiAgYXJyLnJlYWRVSW50MzJMRSA9IEJQLnJlYWRVSW50MzJMRVxuICBhcnIucmVhZFVJbnQzMkJFID0gQlAucmVhZFVJbnQzMkJFXG4gIGFyci5yZWFkSW50OCA9IEJQLnJlYWRJbnQ4XG4gIGFyci5yZWFkSW50MTZMRSA9IEJQLnJlYWRJbnQxNkxFXG4gIGFyci5yZWFkSW50MTZCRSA9IEJQLnJlYWRJbnQxNkJFXG4gIGFyci5yZWFkSW50MzJMRSA9IEJQLnJlYWRJbnQzMkxFXG4gIGFyci5yZWFkSW50MzJCRSA9IEJQLnJlYWRJbnQzMkJFXG4gIGFyci5yZWFkRmxvYXRMRSA9IEJQLnJlYWRGbG9hdExFXG4gIGFyci5yZWFkRmxvYXRCRSA9IEJQLnJlYWRGbG9hdEJFXG4gIGFyci5yZWFkRG91YmxlTEUgPSBCUC5yZWFkRG91YmxlTEVcbiAgYXJyLnJlYWREb3VibGVCRSA9IEJQLnJlYWREb3VibGVCRVxuICBhcnIud3JpdGVVSW50OCA9IEJQLndyaXRlVUludDhcbiAgYXJyLndyaXRlVUludDE2TEUgPSBCUC53cml0ZVVJbnQxNkxFXG4gIGFyci53cml0ZVVJbnQxNkJFID0gQlAud3JpdGVVSW50MTZCRVxuICBhcnIud3JpdGVVSW50MzJMRSA9IEJQLndyaXRlVUludDMyTEVcbiAgYXJyLndyaXRlVUludDMyQkUgPSBCUC53cml0ZVVJbnQzMkJFXG4gIGFyci53cml0ZUludDggPSBCUC53cml0ZUludDhcbiAgYXJyLndyaXRlSW50MTZMRSA9IEJQLndyaXRlSW50MTZMRVxuICBhcnIud3JpdGVJbnQxNkJFID0gQlAud3JpdGVJbnQxNkJFXG4gIGFyci53cml0ZUludDMyTEUgPSBCUC53cml0ZUludDMyTEVcbiAgYXJyLndyaXRlSW50MzJCRSA9IEJQLndyaXRlSW50MzJCRVxuICBhcnIud3JpdGVGbG9hdExFID0gQlAud3JpdGVGbG9hdExFXG4gIGFyci53cml0ZUZsb2F0QkUgPSBCUC53cml0ZUZsb2F0QkVcbiAgYXJyLndyaXRlRG91YmxlTEUgPSBCUC53cml0ZURvdWJsZUxFXG4gIGFyci53cml0ZURvdWJsZUJFID0gQlAud3JpdGVEb3VibGVCRVxuICBhcnIuZmlsbCA9IEJQLmZpbGxcbiAgYXJyLmluc3BlY3QgPSBCUC5pbnNwZWN0XG4gIGFyci50b0FycmF5QnVmZmVyID0gQlAudG9BcnJheUJ1ZmZlclxuXG4gIHJldHVybiBhcnJcbn1cblxuZnVuY3Rpb24gc3RyaW5ndHJpbSAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKClcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJylcbn1cblxuLy8gc2xpY2Uoc3RhcnQsIGVuZClcbmZ1bmN0aW9uIGNsYW1wIChpbmRleCwgbGVuLCBkZWZhdWx0VmFsdWUpIHtcbiAgaWYgKHR5cGVvZiBpbmRleCAhPT0gJ251bWJlcicpIHJldHVybiBkZWZhdWx0VmFsdWVcbiAgaW5kZXggPSB+fmluZGV4OyAgLy8gQ29lcmNlIHRvIGludGVnZXIuXG4gIGlmIChpbmRleCA+PSBsZW4pIHJldHVybiBsZW5cbiAgaWYgKGluZGV4ID49IDApIHJldHVybiBpbmRleFxuICBpbmRleCArPSBsZW5cbiAgaWYgKGluZGV4ID49IDApIHJldHVybiBpbmRleFxuICByZXR1cm4gMFxufVxuXG5mdW5jdGlvbiBjb2VyY2UgKGxlbmd0aCkge1xuICAvLyBDb2VyY2UgbGVuZ3RoIHRvIGEgbnVtYmVyIChwb3NzaWJseSBOYU4pLCByb3VuZCB1cFxuICAvLyBpbiBjYXNlIGl0J3MgZnJhY3Rpb25hbCAoZS5nLiAxMjMuNDU2KSB0aGVuIGRvIGFcbiAgLy8gZG91YmxlIG5lZ2F0ZSB0byBjb2VyY2UgYSBOYU4gdG8gMC4gRWFzeSwgcmlnaHQ/XG4gIGxlbmd0aCA9IH5+TWF0aC5jZWlsKCtsZW5ndGgpXG4gIHJldHVybiBsZW5ndGggPCAwID8gMCA6IGxlbmd0aFxufVxuXG5mdW5jdGlvbiBpc0FycmF5IChzdWJqZWN0KSB7XG4gIHJldHVybiAoQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoc3ViamVjdCkge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc3ViamVjdCkgPT09ICdbb2JqZWN0IEFycmF5XSdcbiAgfSkoc3ViamVjdClcbn1cblxuZnVuY3Rpb24gaXNBcnJheWlzaCAoc3ViamVjdCkge1xuICByZXR1cm4gaXNBcnJheShzdWJqZWN0KSB8fCBCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkgfHxcbiAgICAgIHN1YmplY3QgJiYgdHlwZW9mIHN1YmplY3QgPT09ICdvYmplY3QnICYmXG4gICAgICB0eXBlb2Ygc3ViamVjdC5sZW5ndGggPT09ICdudW1iZXInXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYiA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaWYgKGIgPD0gMHg3Rikge1xuICAgICAgYnl0ZUFycmF5LnB1c2goYilcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHN0YXJ0ID0gaVxuICAgICAgaWYgKGIgPj0gMHhEODAwICYmIGIgPD0gMHhERkZGKSBpKytcbiAgICAgIHZhciBoID0gZW5jb2RlVVJJQ29tcG9uZW50KHN0ci5zbGljZShzdGFydCwgaSsxKSkuc3Vic3RyKDEpLnNwbGl0KCclJylcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgaC5sZW5ndGg7IGorKykge1xuICAgICAgICBieXRlQXJyYXkucHVzaChwYXJzZUludChoW2pdLCAxNikpXG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KHN0cilcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpXG4gICAgICBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIGRlY29kZVV0ZjhDaGFyIChzdHIpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0cilcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoMHhGRkZEKSAvLyBVVEYgOCBpbnZhbGlkIGNoYXJcbiAgfVxufVxuXG4vKlxuICogV2UgaGF2ZSB0byBtYWtlIHN1cmUgdGhhdCB0aGUgdmFsdWUgaXMgYSB2YWxpZCBpbnRlZ2VyLiBUaGlzIG1lYW5zIHRoYXQgaXRcbiAqIGlzIG5vbi1uZWdhdGl2ZS4gSXQgaGFzIG5vIGZyYWN0aW9uYWwgY29tcG9uZW50IGFuZCB0aGF0IGl0IGRvZXMgbm90XG4gKiBleGNlZWQgdGhlIG1heGltdW0gYWxsb3dlZCB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gdmVyaWZ1aW50ICh2YWx1ZSwgbWF4KSB7XG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInLCAnY2Fubm90IHdyaXRlIGEgbm9uLW51bWJlciBhcyBhIG51bWJlcicpXG4gIGFzc2VydCh2YWx1ZSA+PSAwLCAnc3BlY2lmaWVkIGEgbmVnYXRpdmUgdmFsdWUgZm9yIHdyaXRpbmcgYW4gdW5zaWduZWQgdmFsdWUnKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgaXMgbGFyZ2VyIHRoYW4gbWF4aW11bSB2YWx1ZSBmb3IgdHlwZScpXG4gIGFzc2VydChNYXRoLmZsb29yKHZhbHVlKSA9PT0gdmFsdWUsICd2YWx1ZSBoYXMgYSBmcmFjdGlvbmFsIGNvbXBvbmVudCcpXG59XG5cbmZ1bmN0aW9uIHZlcmlmc2ludCAodmFsdWUsIG1heCwgbWluKSB7XG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInLCAnY2Fubm90IHdyaXRlIGEgbm9uLW51bWJlciBhcyBhIG51bWJlcicpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBsYXJnZXIgdGhhbiBtYXhpbXVtIGFsbG93ZWQgdmFsdWUnKVxuICBhc3NlcnQodmFsdWUgPj0gbWluLCAndmFsdWUgc21hbGxlciB0aGFuIG1pbmltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydChNYXRoLmZsb29yKHZhbHVlKSA9PT0gdmFsdWUsICd2YWx1ZSBoYXMgYSBmcmFjdGlvbmFsIGNvbXBvbmVudCcpXG59XG5cbmZ1bmN0aW9uIHZlcmlmSUVFRTc1NCAodmFsdWUsIG1heCwgbWluKSB7XG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInLCAnY2Fubm90IHdyaXRlIGEgbm9uLW51bWJlciBhcyBhIG51bWJlcicpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBsYXJnZXIgdGhhbiBtYXhpbXVtIGFsbG93ZWQgdmFsdWUnKVxuICBhc3NlcnQodmFsdWUgPj0gbWluLCAndmFsdWUgc21hbGxlciB0aGFuIG1pbmltdW0gYWxsb3dlZCB2YWx1ZScpXG59XG5cbmZ1bmN0aW9uIGFzc2VydCAodGVzdCwgbWVzc2FnZSkge1xuICBpZiAoIXRlc3QpIHRocm93IG5ldyBFcnJvcihtZXNzYWdlIHx8ICdGYWlsZWQgYXNzZXJ0aW9uJylcbn1cbiIsInZhciBsb29rdXAgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7XG5cbjsoZnVuY3Rpb24gKGV4cG9ydHMpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG4gIHZhciBBcnIgPSAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKVxuICAgID8gVWludDhBcnJheVxuICAgIDogQXJyYXlcblxuXHR2YXIgWkVSTyAgID0gJzAnLmNoYXJDb2RlQXQoMClcblx0dmFyIFBMVVMgICA9ICcrJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSCAgPSAnLycuY2hhckNvZGVBdCgwKVxuXHR2YXIgTlVNQkVSID0gJzAnLmNoYXJDb2RlQXQoMClcblx0dmFyIExPV0VSICA9ICdhJy5jaGFyQ29kZUF0KDApXG5cdHZhciBVUFBFUiAgPSAnQScuY2hhckNvZGVBdCgwKVxuXG5cdGZ1bmN0aW9uIGRlY29kZSAoZWx0KSB7XG5cdFx0dmFyIGNvZGUgPSBlbHQuY2hhckNvZGVBdCgwKVxuXHRcdGlmIChjb2RlID09PSBQTFVTKVxuXHRcdFx0cmV0dXJuIDYyIC8vICcrJ1xuXHRcdGlmIChjb2RlID09PSBTTEFTSClcblx0XHRcdHJldHVybiA2MyAvLyAnLydcblx0XHRpZiAoY29kZSA8IE5VTUJFUilcblx0XHRcdHJldHVybiAtMSAvL25vIG1hdGNoXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIgKyAxMClcblx0XHRcdHJldHVybiBjb2RlIC0gTlVNQkVSICsgMjYgKyAyNlxuXHRcdGlmIChjb2RlIDwgVVBQRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gVVBQRVJcblx0XHRpZiAoY29kZSA8IExPV0VSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIExPV0VSICsgMjZcblx0fVxuXG5cdGZ1bmN0aW9uIGI2NFRvQnl0ZUFycmF5IChiNjQpIHtcblx0XHR2YXIgaSwgaiwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuXG5cdFx0aWYgKGI2NC5sZW5ndGggJSA0ID4gMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0Jylcblx0XHR9XG5cblx0XHQvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuXHRcdC8vIGlmIHRoZXJlIGFyZSB0d28gcGxhY2Vob2xkZXJzLCB0aGFuIHRoZSB0d28gY2hhcmFjdGVycyBiZWZvcmUgaXRcblx0XHQvLyByZXByZXNlbnQgb25lIGJ5dGVcblx0XHQvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcblx0XHQvLyB0aGlzIGlzIGp1c3QgYSBjaGVhcCBoYWNrIHRvIG5vdCBkbyBpbmRleE9mIHR3aWNlXG5cdFx0dmFyIGxlbiA9IGI2NC5sZW5ndGhcblx0XHRwbGFjZUhvbGRlcnMgPSAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMikgPyAyIDogJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDEpID8gMSA6IDBcblxuXHRcdC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuXHRcdGFyciA9IG5ldyBBcnIoYjY0Lmxlbmd0aCAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKVxuXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuXHRcdGwgPSBwbGFjZUhvbGRlcnMgPiAwID8gYjY0Lmxlbmd0aCAtIDQgOiBiNjQubGVuZ3RoXG5cblx0XHR2YXIgTCA9IDBcblxuXHRcdGZ1bmN0aW9uIHB1c2ggKHYpIHtcblx0XHRcdGFycltMKytdID0gdlxuXHRcdH1cblxuXHRcdGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbDsgaSArPSA0LCBqICs9IDMpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTgpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgMTIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPDwgNikgfCBkZWNvZGUoYjY0LmNoYXJBdChpICsgMykpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDAwMCkgPj4gMTYpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDApID4+IDgpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0aWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpID4+IDQpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTApIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgNCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA+PiAyKVxuXHRcdFx0cHVzaCgodG1wID4+IDgpICYgMHhGRilcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRyZXR1cm4gYXJyXG5cdH1cblxuXHRmdW5jdGlvbiB1aW50OFRvQmFzZTY0ICh1aW50OCkge1xuXHRcdHZhciBpLFxuXHRcdFx0ZXh0cmFCeXRlcyA9IHVpbnQ4Lmxlbmd0aCAlIDMsIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG5cdFx0XHRvdXRwdXQgPSBcIlwiLFxuXHRcdFx0dGVtcCwgbGVuZ3RoXG5cblx0XHRmdW5jdGlvbiBlbmNvZGUgKG51bSkge1xuXHRcdFx0cmV0dXJuIGxvb2t1cC5jaGFyQXQobnVtKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG5cdFx0XHRyZXR1cm4gZW5jb2RlKG51bSA+PiAxOCAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiAxMiAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiA2ICYgMHgzRikgKyBlbmNvZGUobnVtICYgMHgzRilcblx0XHR9XG5cblx0XHQvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG5cdFx0Zm9yIChpID0gMCwgbGVuZ3RoID0gdWludDgubGVuZ3RoIC0gZXh0cmFCeXRlczsgaSA8IGxlbmd0aDsgaSArPSAzKSB7XG5cdFx0XHR0ZW1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuXHRcdFx0b3V0cHV0ICs9IHRyaXBsZXRUb0Jhc2U2NCh0ZW1wKVxuXHRcdH1cblxuXHRcdC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcblx0XHRzd2l0Y2ggKGV4dHJhQnl0ZXMpIHtcblx0XHRcdGNhc2UgMTpcblx0XHRcdFx0dGVtcCA9IHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAyKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9PSdcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgMjpcblx0XHRcdFx0dGVtcCA9ICh1aW50OFt1aW50OC5sZW5ndGggLSAyXSA8PCA4KSArICh1aW50OFt1aW50OC5sZW5ndGggLSAxXSlcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDEwKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wID4+IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCAyKSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPSdcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cblx0XHRyZXR1cm4gb3V0cHV0XG5cdH1cblxuXHRtb2R1bGUuZXhwb3J0cy50b0J5dGVBcnJheSA9IGI2NFRvQnl0ZUFycmF5XG5cdG1vZHVsZS5leHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0XG59KCkpXG4iLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbihidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIG5CaXRzID0gLTcsXG4gICAgICBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDAsXG4gICAgICBkID0gaXNMRSA/IC0xIDogMSxcbiAgICAgIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV07XG5cbiAgaSArPSBkO1xuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpO1xuICBzID4+PSAoLW5CaXRzKTtcbiAgbkJpdHMgKz0gZUxlbjtcbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCk7XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIGUgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBtTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXM7XG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KTtcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pO1xuICAgIGUgPSBlIC0gZUJpYXM7XG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbik7XG59O1xuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24oYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGMsXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApLFxuICAgICAgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpLFxuICAgICAgZCA9IGlzTEUgPyAxIDogLTEsXG4gICAgICBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwO1xuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpO1xuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwO1xuICAgIGUgPSBlTWF4O1xuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKTtcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS07XG4gICAgICBjICo9IDI7XG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcyk7XG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrO1xuICAgICAgYyAvPSAyO1xuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDA7XG4gICAgICBlID0gZU1heDtcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbik7XG4gICAgICBlID0gZSArIGVCaWFzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbik7XG4gICAgICBlID0gMDtcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KTtcblxuICBlID0gKGUgPDwgbUxlbikgfCBtO1xuICBlTGVuICs9IG1MZW47XG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCk7XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4O1xufTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4oZnVuY3Rpb24oZ2xvYmFsKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgaWYgKGdsb2JhbC4kdHJhY2V1clJ1bnRpbWUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyICRPYmplY3QgPSBPYmplY3Q7XG4gIHZhciAkVHlwZUVycm9yID0gVHlwZUVycm9yO1xuICB2YXIgJGNyZWF0ZSA9ICRPYmplY3QuY3JlYXRlO1xuICB2YXIgJGRlZmluZVByb3BlcnRpZXMgPSAkT2JqZWN0LmRlZmluZVByb3BlcnRpZXM7XG4gIHZhciAkZGVmaW5lUHJvcGVydHkgPSAkT2JqZWN0LmRlZmluZVByb3BlcnR5O1xuICB2YXIgJGZyZWV6ZSA9ICRPYmplY3QuZnJlZXplO1xuICB2YXIgJGdldE93blByb3BlcnR5RGVzY3JpcHRvciA9ICRPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yO1xuICB2YXIgJGdldE93blByb3BlcnR5TmFtZXMgPSAkT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXM7XG4gIHZhciAkZ2V0UHJvdG90eXBlT2YgPSAkT2JqZWN0LmdldFByb3RvdHlwZU9mO1xuICB2YXIgJGhhc093blByb3BlcnR5ID0gJE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG4gIHZhciAkdG9TdHJpbmcgPSAkT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgZnVuY3Rpb24gbm9uRW51bSh2YWx1ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfTtcbiAgfVxuICB2YXIgdHlwZXMgPSB7XG4gICAgdm9pZDogZnVuY3Rpb24gdm9pZFR5cGUoKSB7fSxcbiAgICBhbnk6IGZ1bmN0aW9uIGFueSgpIHt9LFxuICAgIHN0cmluZzogZnVuY3Rpb24gc3RyaW5nKCkge30sXG4gICAgbnVtYmVyOiBmdW5jdGlvbiBudW1iZXIoKSB7fSxcbiAgICBib29sZWFuOiBmdW5jdGlvbiBib29sZWFuKCkge31cbiAgfTtcbiAgdmFyIG1ldGhvZCA9IG5vbkVudW07XG4gIHZhciBjb3VudGVyID0gMDtcbiAgZnVuY3Rpb24gbmV3VW5pcXVlU3RyaW5nKCkge1xuICAgIHJldHVybiAnX18kJyArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDFlOSkgKyAnJCcgKyArK2NvdW50ZXIgKyAnJF9fJztcbiAgfVxuICB2YXIgc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eSA9IG5ld1VuaXF1ZVN0cmluZygpO1xuICB2YXIgc3ltYm9sRGVzY3JpcHRpb25Qcm9wZXJ0eSA9IG5ld1VuaXF1ZVN0cmluZygpO1xuICB2YXIgc3ltYm9sRGF0YVByb3BlcnR5ID0gbmV3VW5pcXVlU3RyaW5nKCk7XG4gIHZhciBzeW1ib2xWYWx1ZXMgPSAkY3JlYXRlKG51bGwpO1xuICBmdW5jdGlvbiBpc1N5bWJvbChzeW1ib2wpIHtcbiAgICByZXR1cm4gdHlwZW9mIHN5bWJvbCA9PT0gJ29iamVjdCcgJiYgc3ltYm9sIGluc3RhbmNlb2YgU3ltYm9sVmFsdWU7XG4gIH1cbiAgZnVuY3Rpb24gdHlwZU9mKHYpIHtcbiAgICBpZiAoaXNTeW1ib2wodikpXG4gICAgICByZXR1cm4gJ3N5bWJvbCc7XG4gICAgcmV0dXJuIHR5cGVvZiB2O1xuICB9XG4gIGZ1bmN0aW9uIFN5bWJvbChkZXNjcmlwdGlvbikge1xuICAgIHZhciB2YWx1ZSA9IG5ldyBTeW1ib2xWYWx1ZShkZXNjcmlwdGlvbik7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFN5bWJvbCkpXG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignU3ltYm9sIGNhbm5vdCBiZSBuZXdcXCdlZCcpO1xuICB9XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2wucHJvdG90eXBlLCAnY29uc3RydWN0b3InLCBub25FbnVtKFN5bWJvbCkpO1xuICAkZGVmaW5lUHJvcGVydHkoU3ltYm9sLnByb3RvdHlwZSwgJ3RvU3RyaW5nJywgbWV0aG9kKGZ1bmN0aW9uKCkge1xuICAgIHZhciBzeW1ib2xWYWx1ZSA9IHRoaXNbc3ltYm9sRGF0YVByb3BlcnR5XTtcbiAgICBpZiAoIWdldE9wdGlvbignc3ltYm9scycpKVxuICAgICAgcmV0dXJuIHN5bWJvbFZhbHVlW3N5bWJvbEludGVybmFsUHJvcGVydHldO1xuICAgIGlmICghc3ltYm9sVmFsdWUpXG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ0NvbnZlcnNpb24gZnJvbSBzeW1ib2wgdG8gc3RyaW5nJyk7XG4gICAgdmFyIGRlc2MgPSBzeW1ib2xWYWx1ZVtzeW1ib2xEZXNjcmlwdGlvblByb3BlcnR5XTtcbiAgICBpZiAoZGVzYyA9PT0gdW5kZWZpbmVkKVxuICAgICAgZGVzYyA9ICcnO1xuICAgIHJldHVybiAnU3ltYm9sKCcgKyBkZXNjICsgJyknO1xuICB9KSk7XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2wucHJvdG90eXBlLCAndmFsdWVPZicsIG1ldGhvZChmdW5jdGlvbigpIHtcbiAgICB2YXIgc3ltYm9sVmFsdWUgPSB0aGlzW3N5bWJvbERhdGFQcm9wZXJ0eV07XG4gICAgaWYgKCFzeW1ib2xWYWx1ZSlcbiAgICAgIHRocm93IFR5cGVFcnJvcignQ29udmVyc2lvbiBmcm9tIHN5bWJvbCB0byBzdHJpbmcnKTtcbiAgICBpZiAoIWdldE9wdGlvbignc3ltYm9scycpKVxuICAgICAgcmV0dXJuIHN5bWJvbFZhbHVlW3N5bWJvbEludGVybmFsUHJvcGVydHldO1xuICAgIHJldHVybiBzeW1ib2xWYWx1ZTtcbiAgfSkpO1xuICBmdW5jdGlvbiBTeW1ib2xWYWx1ZShkZXNjcmlwdGlvbikge1xuICAgIHZhciBrZXkgPSBuZXdVbmlxdWVTdHJpbmcoKTtcbiAgICAkZGVmaW5lUHJvcGVydHkodGhpcywgc3ltYm9sRGF0YVByb3BlcnR5LCB7dmFsdWU6IHRoaXN9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkodGhpcywgc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eSwge3ZhbHVlOiBrZXl9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkodGhpcywgc3ltYm9sRGVzY3JpcHRpb25Qcm9wZXJ0eSwge3ZhbHVlOiBkZXNjcmlwdGlvbn0pO1xuICAgICRmcmVlemUodGhpcyk7XG4gICAgc3ltYm9sVmFsdWVzW2tleV0gPSB0aGlzO1xuICB9XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2xWYWx1ZS5wcm90b3R5cGUsICdjb25zdHJ1Y3RvcicsIG5vbkVudW0oU3ltYm9sKSk7XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2xWYWx1ZS5wcm90b3R5cGUsICd0b1N0cmluZycsIHtcbiAgICB2YWx1ZTogU3ltYm9sLnByb3RvdHlwZS50b1N0cmluZyxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICB9KTtcbiAgJGRlZmluZVByb3BlcnR5KFN5bWJvbFZhbHVlLnByb3RvdHlwZSwgJ3ZhbHVlT2YnLCB7XG4gICAgdmFsdWU6IFN5bWJvbC5wcm90b3R5cGUudmFsdWVPZixcbiAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICB9KTtcbiAgJGZyZWV6ZShTeW1ib2xWYWx1ZS5wcm90b3R5cGUpO1xuICBTeW1ib2wuaXRlcmF0b3IgPSBTeW1ib2woKTtcbiAgZnVuY3Rpb24gdG9Qcm9wZXJ0eShuYW1lKSB7XG4gICAgaWYgKGlzU3ltYm9sKG5hbWUpKVxuICAgICAgcmV0dXJuIG5hbWVbc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eV07XG4gICAgcmV0dXJuIG5hbWU7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpIHtcbiAgICB2YXIgcnYgPSBbXTtcbiAgICB2YXIgbmFtZXMgPSAkZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBuYW1lID0gbmFtZXNbaV07XG4gICAgICBpZiAoIXN5bWJvbFZhbHVlc1tuYW1lXSlcbiAgICAgICAgcnYucHVzaChuYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIHJ2O1xuICB9XG4gIGZ1bmN0aW9uIGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIG5hbWUpIHtcbiAgICByZXR1cm4gJGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIHRvUHJvcGVydHkobmFtZSkpO1xuICB9XG4gIGZ1bmN0aW9uIGdldE93blByb3BlcnR5U3ltYm9scyhvYmplY3QpIHtcbiAgICB2YXIgcnYgPSBbXTtcbiAgICB2YXIgbmFtZXMgPSAkZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBzeW1ib2wgPSBzeW1ib2xWYWx1ZXNbbmFtZXNbaV1dO1xuICAgICAgaWYgKHN5bWJvbClcbiAgICAgICAgcnYucHVzaChzeW1ib2wpO1xuICAgIH1cbiAgICByZXR1cm4gcnY7XG4gIH1cbiAgZnVuY3Rpb24gaGFzT3duUHJvcGVydHkobmFtZSkge1xuICAgIHJldHVybiAkaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCB0b1Byb3BlcnR5KG5hbWUpKTtcbiAgfVxuICBmdW5jdGlvbiBnZXRPcHRpb24obmFtZSkge1xuICAgIHJldHVybiBnbG9iYWwudHJhY2V1ciAmJiBnbG9iYWwudHJhY2V1ci5vcHRpb25zW25hbWVdO1xuICB9XG4gIGZ1bmN0aW9uIHNldFByb3BlcnR5KG9iamVjdCwgbmFtZSwgdmFsdWUpIHtcbiAgICB2YXIgc3ltLFxuICAgICAgICBkZXNjO1xuICAgIGlmIChpc1N5bWJvbChuYW1lKSkge1xuICAgICAgc3ltID0gbmFtZTtcbiAgICAgIG5hbWUgPSBuYW1lW3N5bWJvbEludGVybmFsUHJvcGVydHldO1xuICAgIH1cbiAgICBvYmplY3RbbmFtZV0gPSB2YWx1ZTtcbiAgICBpZiAoc3ltICYmIChkZXNjID0gJGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIG5hbWUpKSlcbiAgICAgICRkZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIHtlbnVtZXJhYmxlOiBmYWxzZX0pO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIGRlc2NyaXB0b3IpIHtcbiAgICBpZiAoaXNTeW1ib2wobmFtZSkpIHtcbiAgICAgIGlmIChkZXNjcmlwdG9yLmVudW1lcmFibGUpIHtcbiAgICAgICAgZGVzY3JpcHRvciA9ICRjcmVhdGUoZGVzY3JpcHRvciwge2VudW1lcmFibGU6IHt2YWx1ZTogZmFsc2V9fSk7XG4gICAgICB9XG4gICAgICBuYW1lID0gbmFtZVtzeW1ib2xJbnRlcm5hbFByb3BlcnR5XTtcbiAgICB9XG4gICAgJGRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwgZGVzY3JpcHRvcik7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbE9iamVjdChPYmplY3QpIHtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnZGVmaW5lUHJvcGVydHknLCB7dmFsdWU6IGRlZmluZVByb3BlcnR5fSk7XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ2dldE93blByb3BlcnR5TmFtZXMnLCB7dmFsdWU6IGdldE93blByb3BlcnR5TmFtZXN9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yJywge3ZhbHVlOiBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3J9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LnByb3RvdHlwZSwgJ2hhc093blByb3BlcnR5Jywge3ZhbHVlOiBoYXNPd25Qcm9wZXJ0eX0pO1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPSBnZXRPd25Qcm9wZXJ0eVN5bWJvbHM7XG4gICAgZnVuY3Rpb24gaXMobGVmdCwgcmlnaHQpIHtcbiAgICAgIGlmIChsZWZ0ID09PSByaWdodClcbiAgICAgICAgcmV0dXJuIGxlZnQgIT09IDAgfHwgMSAvIGxlZnQgPT09IDEgLyByaWdodDtcbiAgICAgIHJldHVybiBsZWZ0ICE9PSBsZWZ0ICYmIHJpZ2h0ICE9PSByaWdodDtcbiAgICB9XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ2lzJywgbWV0aG9kKGlzKSk7XG4gICAgZnVuY3Rpb24gYXNzaWduKHRhcmdldCwgc291cmNlKSB7XG4gICAgICB2YXIgcHJvcHMgPSAkZ2V0T3duUHJvcGVydHlOYW1lcyhzb3VyY2UpO1xuICAgICAgdmFyIHAsXG4gICAgICAgICAgbGVuZ3RoID0gcHJvcHMubGVuZ3RoO1xuICAgICAgZm9yIChwID0gMDsgcCA8IGxlbmd0aDsgcCsrKSB7XG4gICAgICAgIHRhcmdldFtwcm9wc1twXV0gPSBzb3VyY2VbcHJvcHNbcF1dO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ2Fzc2lnbicsIG1ldGhvZChhc3NpZ24pKTtcbiAgICBmdW5jdGlvbiBtaXhpbih0YXJnZXQsIHNvdXJjZSkge1xuICAgICAgdmFyIHByb3BzID0gJGdldE93blByb3BlcnR5TmFtZXMoc291cmNlKTtcbiAgICAgIHZhciBwLFxuICAgICAgICAgIGRlc2NyaXB0b3IsXG4gICAgICAgICAgbGVuZ3RoID0gcHJvcHMubGVuZ3RoO1xuICAgICAgZm9yIChwID0gMDsgcCA8IGxlbmd0aDsgcCsrKSB7XG4gICAgICAgIGRlc2NyaXB0b3IgPSAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNvdXJjZSwgcHJvcHNbcF0pO1xuICAgICAgICAkZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwcm9wc1twXSwgZGVzY3JpcHRvcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnbWl4aW4nLCBtZXRob2QobWl4aW4pKTtcbiAgfVxuICBmdW5jdGlvbiBleHBvcnRTdGFyKG9iamVjdCkge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbmFtZXMgPSAkZ2V0T3duUHJvcGVydHlOYW1lcyhhcmd1bWVudHNbaV0pO1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBuYW1lcy5sZW5ndGg7IGorKykge1xuICAgICAgICAoZnVuY3Rpb24obW9kLCBuYW1lKSB7XG4gICAgICAgICAgJGRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG1vZFtuYW1lXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pKGFyZ3VtZW50c1tpXSwgbmFtZXNbal0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0O1xuICB9XG4gIGZ1bmN0aW9uIHRvT2JqZWN0KHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09IG51bGwpXG4gICAgICB0aHJvdyAkVHlwZUVycm9yKCk7XG4gICAgcmV0dXJuICRPYmplY3QodmFsdWUpO1xuICB9XG4gIGZ1bmN0aW9uIHNwcmVhZCgpIHtcbiAgICB2YXIgcnYgPSBbXSxcbiAgICAgICAgayA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB2YWx1ZVRvU3ByZWFkID0gdG9PYmplY3QoYXJndW1lbnRzW2ldKTtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdmFsdWVUb1NwcmVhZC5sZW5ndGg7IGorKykge1xuICAgICAgICBydltrKytdID0gdmFsdWVUb1NwcmVhZFtqXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJ2O1xuICB9XG4gIGZ1bmN0aW9uIGdldFByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIG5hbWUpIHtcbiAgICB3aGlsZSAob2JqZWN0ICE9PSBudWxsKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gJGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIG5hbWUpO1xuICAgICAgaWYgKHJlc3VsdClcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIG9iamVjdCA9ICRnZXRQcm90b3R5cGVPZihvYmplY3QpO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGZ1bmN0aW9uIHN1cGVyRGVzY3JpcHRvcihob21lT2JqZWN0LCBuYW1lKSB7XG4gICAgdmFyIHByb3RvID0gJGdldFByb3RvdHlwZU9mKGhvbWVPYmplY3QpO1xuICAgIGlmICghcHJvdG8pXG4gICAgICB0aHJvdyAkVHlwZUVycm9yKCdzdXBlciBpcyBudWxsJyk7XG4gICAgcmV0dXJuIGdldFByb3BlcnR5RGVzY3JpcHRvcihwcm90bywgbmFtZSk7XG4gIH1cbiAgZnVuY3Rpb24gc3VwZXJDYWxsKHNlbGYsIGhvbWVPYmplY3QsIG5hbWUsIGFyZ3MpIHtcbiAgICB2YXIgZGVzY3JpcHRvciA9IHN1cGVyRGVzY3JpcHRvcihob21lT2JqZWN0LCBuYW1lKTtcbiAgICBpZiAoZGVzY3JpcHRvcikge1xuICAgICAgaWYgKCd2YWx1ZScgaW4gZGVzY3JpcHRvcilcbiAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3IudmFsdWUuYXBwbHkoc2VsZiwgYXJncyk7XG4gICAgICBpZiAoZGVzY3JpcHRvci5nZXQpXG4gICAgICAgIHJldHVybiBkZXNjcmlwdG9yLmdldC5jYWxsKHNlbGYpLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICAgIH1cbiAgICB0aHJvdyAkVHlwZUVycm9yKFwic3VwZXIgaGFzIG5vIG1ldGhvZCAnXCIgKyBuYW1lICsgXCInLlwiKTtcbiAgfVxuICBmdW5jdGlvbiBzdXBlckdldChzZWxmLCBob21lT2JqZWN0LCBuYW1lKSB7XG4gICAgdmFyIGRlc2NyaXB0b3IgPSBzdXBlckRlc2NyaXB0b3IoaG9tZU9iamVjdCwgbmFtZSk7XG4gICAgaWYgKGRlc2NyaXB0b3IpIHtcbiAgICAgIGlmIChkZXNjcmlwdG9yLmdldClcbiAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3IuZ2V0LmNhbGwoc2VsZik7XG4gICAgICBlbHNlIGlmICgndmFsdWUnIGluIGRlc2NyaXB0b3IpXG4gICAgICAgIHJldHVybiBkZXNjcmlwdG9yLnZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGZ1bmN0aW9uIHN1cGVyU2V0KHNlbGYsIGhvbWVPYmplY3QsIG5hbWUsIHZhbHVlKSB7XG4gICAgdmFyIGRlc2NyaXB0b3IgPSBzdXBlckRlc2NyaXB0b3IoaG9tZU9iamVjdCwgbmFtZSk7XG4gICAgaWYgKGRlc2NyaXB0b3IgJiYgZGVzY3JpcHRvci5zZXQpIHtcbiAgICAgIGRlc2NyaXB0b3Iuc2V0LmNhbGwoc2VsZiwgdmFsdWUpO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICB0aHJvdyAkVHlwZUVycm9yKFwic3VwZXIgaGFzIG5vIHNldHRlciAnXCIgKyBuYW1lICsgXCInLlwiKTtcbiAgfVxuICBmdW5jdGlvbiBnZXREZXNjcmlwdG9ycyhvYmplY3QpIHtcbiAgICB2YXIgZGVzY3JpcHRvcnMgPSB7fSxcbiAgICAgICAgbmFtZSxcbiAgICAgICAgbmFtZXMgPSAkZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBuYW1lID0gbmFtZXNbaV07XG4gICAgICBkZXNjcmlwdG9yc1tuYW1lXSA9ICRnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBuYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlc2NyaXB0b3JzO1xuICB9XG4gIGZ1bmN0aW9uIGNyZWF0ZUNsYXNzKGN0b3IsIG9iamVjdCwgc3RhdGljT2JqZWN0LCBzdXBlckNsYXNzKSB7XG4gICAgJGRlZmluZVByb3BlcnR5KG9iamVjdCwgJ2NvbnN0cnVjdG9yJywge1xuICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAzKSB7XG4gICAgICBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgPT09ICdmdW5jdGlvbicpXG4gICAgICAgIGN0b3IuX19wcm90b19fID0gc3VwZXJDbGFzcztcbiAgICAgIGN0b3IucHJvdG90eXBlID0gJGNyZWF0ZShnZXRQcm90b1BhcmVudChzdXBlckNsYXNzKSwgZ2V0RGVzY3JpcHRvcnMob2JqZWN0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN0b3IucHJvdG90eXBlID0gb2JqZWN0O1xuICAgIH1cbiAgICAkZGVmaW5lUHJvcGVydHkoY3RvciwgJ3Byb3RvdHlwZScsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2VcbiAgICB9KTtcbiAgICByZXR1cm4gJGRlZmluZVByb3BlcnRpZXMoY3RvciwgZ2V0RGVzY3JpcHRvcnMoc3RhdGljT2JqZWN0KSk7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0UHJvdG9QYXJlbnQoc3VwZXJDbGFzcykge1xuICAgIGlmICh0eXBlb2Ygc3VwZXJDbGFzcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdmFyIHByb3RvdHlwZSA9IHN1cGVyQ2xhc3MucHJvdG90eXBlO1xuICAgICAgaWYgKCRPYmplY3QocHJvdG90eXBlKSA9PT0gcHJvdG90eXBlIHx8IHByb3RvdHlwZSA9PT0gbnVsbClcbiAgICAgICAgcmV0dXJuIHN1cGVyQ2xhc3MucHJvdG90eXBlO1xuICAgIH1cbiAgICBpZiAoc3VwZXJDbGFzcyA9PT0gbnVsbClcbiAgICAgIHJldHVybiBudWxsO1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoKTtcbiAgfVxuICBmdW5jdGlvbiBkZWZhdWx0U3VwZXJDYWxsKHNlbGYsIGhvbWVPYmplY3QsIGFyZ3MpIHtcbiAgICBpZiAoJGdldFByb3RvdHlwZU9mKGhvbWVPYmplY3QpICE9PSBudWxsKVxuICAgICAgc3VwZXJDYWxsKHNlbGYsIGhvbWVPYmplY3QsICdjb25zdHJ1Y3RvcicsIGFyZ3MpO1xuICB9XG4gIHZhciBTVF9ORVdCT1JOID0gMDtcbiAgdmFyIFNUX0VYRUNVVElORyA9IDE7XG4gIHZhciBTVF9TVVNQRU5ERUQgPSAyO1xuICB2YXIgU1RfQ0xPU0VEID0gMztcbiAgdmFyIEVORF9TVEFURSA9IC0yO1xuICB2YXIgUkVUSFJPV19TVEFURSA9IC0zO1xuICBmdW5jdGlvbiBhZGRJdGVyYXRvcihvYmplY3QpIHtcbiAgICByZXR1cm4gZGVmaW5lUHJvcGVydHkob2JqZWN0LCBTeW1ib2wuaXRlcmF0b3IsIG5vbkVudW0oZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9KSk7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0SW50ZXJuYWxFcnJvcihzdGF0ZSkge1xuICAgIHJldHVybiBuZXcgRXJyb3IoJ1RyYWNldXIgY29tcGlsZXIgYnVnOiBpbnZhbGlkIHN0YXRlIGluIHN0YXRlIG1hY2hpbmU6ICcgKyBzdGF0ZSk7XG4gIH1cbiAgZnVuY3Rpb24gR2VuZXJhdG9yQ29udGV4dCgpIHtcbiAgICB0aGlzLnN0YXRlID0gMDtcbiAgICB0aGlzLkdTdGF0ZSA9IFNUX05FV0JPUk47XG4gICAgdGhpcy5zdG9yZWRFeGNlcHRpb24gPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5maW5hbGx5RmFsbFRocm91Z2ggPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5zZW50XyA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnJldHVyblZhbHVlID0gdW5kZWZpbmVkO1xuICAgIHRoaXMudHJ5U3RhY2tfID0gW107XG4gIH1cbiAgR2VuZXJhdG9yQ29udGV4dC5wcm90b3R5cGUgPSB7XG4gICAgcHVzaFRyeTogZnVuY3Rpb24oY2F0Y2hTdGF0ZSwgZmluYWxseVN0YXRlKSB7XG4gICAgICBpZiAoZmluYWxseVN0YXRlICE9PSBudWxsKSB7XG4gICAgICAgIHZhciBmaW5hbGx5RmFsbFRocm91Z2ggPSBudWxsO1xuICAgICAgICBmb3IgKHZhciBpID0gdGhpcy50cnlTdGFja18ubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICBpZiAodGhpcy50cnlTdGFja19baV0uY2F0Y2ggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZmluYWxseUZhbGxUaHJvdWdoID0gdGhpcy50cnlTdGFja19baV0uY2F0Y2g7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpbmFsbHlGYWxsVGhyb3VnaCA9PT0gbnVsbClcbiAgICAgICAgICBmaW5hbGx5RmFsbFRocm91Z2ggPSBSRVRIUk9XX1NUQVRFO1xuICAgICAgICB0aGlzLnRyeVN0YWNrXy5wdXNoKHtcbiAgICAgICAgICBmaW5hbGx5OiBmaW5hbGx5U3RhdGUsXG4gICAgICAgICAgZmluYWxseUZhbGxUaHJvdWdoOiBmaW5hbGx5RmFsbFRocm91Z2hcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAoY2F0Y2hTdGF0ZSAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLnRyeVN0YWNrXy5wdXNoKHtjYXRjaDogY2F0Y2hTdGF0ZX0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgcG9wVHJ5OiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudHJ5U3RhY2tfLnBvcCgpO1xuICAgIH0sXG4gICAgZ2V0IHNlbnQoKSB7XG4gICAgICB0aGlzLm1heWJlVGhyb3coKTtcbiAgICAgIHJldHVybiB0aGlzLnNlbnRfO1xuICAgIH0sXG4gICAgc2V0IHNlbnQodikge1xuICAgICAgdGhpcy5zZW50XyA9IHY7XG4gICAgfSxcbiAgICBnZXQgc2VudElnbm9yZVRocm93KCkge1xuICAgICAgcmV0dXJuIHRoaXMuc2VudF87XG4gICAgfSxcbiAgICBtYXliZVRocm93OiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLmFjdGlvbiA9PT0gJ3Rocm93Jykge1xuICAgICAgICB0aGlzLmFjdGlvbiA9ICduZXh0JztcbiAgICAgICAgdGhyb3cgdGhpcy5zZW50XztcbiAgICAgIH1cbiAgICB9LFxuICAgIGVuZDogZnVuY3Rpb24oKSB7XG4gICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgICAgY2FzZSBFTkRfU1RBVEU6XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIGNhc2UgUkVUSFJPV19TVEFURTpcbiAgICAgICAgICB0aHJvdyB0aGlzLnN0b3JlZEV4Y2VwdGlvbjtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aHJvdyBnZXRJbnRlcm5hbEVycm9yKHRoaXMuc3RhdGUpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgZnVuY3Rpb24gZ2V0TmV4dE9yVGhyb3coY3R4LCBtb3ZlTmV4dCwgYWN0aW9uKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICAgIHN3aXRjaCAoY3R4LkdTdGF0ZSkge1xuICAgICAgICBjYXNlIFNUX0VYRUNVVElORzpcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKFwiXFxcIlwiICsgYWN0aW9uICsgXCJcXFwiIG9uIGV4ZWN1dGluZyBnZW5lcmF0b3JcIikpO1xuICAgICAgICBjYXNlIFNUX0NMT1NFRDpcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKFwiXFxcIlwiICsgYWN0aW9uICsgXCJcXFwiIG9uIGNsb3NlZCBnZW5lcmF0b3JcIikpO1xuICAgICAgICBjYXNlIFNUX05FV0JPUk46XG4gICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ3Rocm93Jykge1xuICAgICAgICAgICAgY3R4LkdTdGF0ZSA9IFNUX0NMT1NFRDtcbiAgICAgICAgICAgIHRocm93IHg7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh4ICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICB0aHJvdyAkVHlwZUVycm9yKCdTZW50IHZhbHVlIHRvIG5ld2Jvcm4gZ2VuZXJhdG9yJyk7XG4gICAgICAgIGNhc2UgU1RfU1VTUEVOREVEOlxuICAgICAgICAgIGN0eC5HU3RhdGUgPSBTVF9FWEVDVVRJTkc7XG4gICAgICAgICAgY3R4LmFjdGlvbiA9IGFjdGlvbjtcbiAgICAgICAgICBjdHguc2VudCA9IHg7XG4gICAgICAgICAgdmFyIHZhbHVlID0gbW92ZU5leHQoY3R4KTtcbiAgICAgICAgICB2YXIgZG9uZSA9IHZhbHVlID09PSBjdHg7XG4gICAgICAgICAgaWYgKGRvbmUpXG4gICAgICAgICAgICB2YWx1ZSA9IGN0eC5yZXR1cm5WYWx1ZTtcbiAgICAgICAgICBjdHguR1N0YXRlID0gZG9uZSA/IFNUX0NMT1NFRCA6IFNUX1NVU1BFTkRFRDtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgZG9uZTogZG9uZVxuICAgICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBnZW5lcmF0b3JXcmFwKGlubmVyRnVuY3Rpb24sIHNlbGYpIHtcbiAgICB2YXIgbW92ZU5leHQgPSBnZXRNb3ZlTmV4dChpbm5lckZ1bmN0aW9uLCBzZWxmKTtcbiAgICB2YXIgY3R4ID0gbmV3IEdlbmVyYXRvckNvbnRleHQoKTtcbiAgICByZXR1cm4gYWRkSXRlcmF0b3Ioe1xuICAgICAgbmV4dDogZ2V0TmV4dE9yVGhyb3coY3R4LCBtb3ZlTmV4dCwgJ25leHQnKSxcbiAgICAgIHRocm93OiBnZXROZXh0T3JUaHJvdyhjdHgsIG1vdmVOZXh0LCAndGhyb3cnKVxuICAgIH0pO1xuICB9XG4gIGZ1bmN0aW9uIEFzeW5jRnVuY3Rpb25Db250ZXh0KCkge1xuICAgIEdlbmVyYXRvckNvbnRleHQuY2FsbCh0aGlzKTtcbiAgICB0aGlzLmVyciA9IHVuZGVmaW5lZDtcbiAgICB2YXIgY3R4ID0gdGhpcztcbiAgICBjdHgucmVzdWx0ID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBjdHgucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICBjdHgucmVqZWN0ID0gcmVqZWN0O1xuICAgIH0pO1xuICB9XG4gIEFzeW5jRnVuY3Rpb25Db250ZXh0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoR2VuZXJhdG9yQ29udGV4dC5wcm90b3R5cGUpO1xuICBBc3luY0Z1bmN0aW9uQ29udGV4dC5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oKSB7XG4gICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICBjYXNlIEVORF9TVEFURTpcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY2FzZSBSRVRIUk9XX1NUQVRFOlxuICAgICAgICB0aGlzLnJlamVjdCh0aGlzLnN0b3JlZEV4Y2VwdGlvbik7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aGlzLnJlamVjdChnZXRJbnRlcm5hbEVycm9yKHRoaXMuc3RhdGUpKTtcbiAgICB9XG4gIH07XG4gIGZ1bmN0aW9uIGFzeW5jV3JhcChpbm5lckZ1bmN0aW9uLCBzZWxmKSB7XG4gICAgdmFyIG1vdmVOZXh0ID0gZ2V0TW92ZU5leHQoaW5uZXJGdW5jdGlvbiwgc2VsZik7XG4gICAgdmFyIGN0eCA9IG5ldyBBc3luY0Z1bmN0aW9uQ29udGV4dCgpO1xuICAgIGN0eC5jcmVhdGVDYWxsYmFjayA9IGZ1bmN0aW9uKG5ld1N0YXRlKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgY3R4LnN0YXRlID0gbmV3U3RhdGU7XG4gICAgICAgIGN0eC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICBtb3ZlTmV4dChjdHgpO1xuICAgICAgfTtcbiAgICB9O1xuICAgIGN0eC5jcmVhdGVFcnJiYWNrID0gZnVuY3Rpb24obmV3U3RhdGUpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgY3R4LnN0YXRlID0gbmV3U3RhdGU7XG4gICAgICAgIGN0eC5lcnIgPSBlcnI7XG4gICAgICAgIG1vdmVOZXh0KGN0eCk7XG4gICAgICB9O1xuICAgIH07XG4gICAgbW92ZU5leHQoY3R4KTtcbiAgICByZXR1cm4gY3R4LnJlc3VsdDtcbiAgfVxuICBmdW5jdGlvbiBnZXRNb3ZlTmV4dChpbm5lckZ1bmN0aW9uLCBzZWxmKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGN0eCkge1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gaW5uZXJGdW5jdGlvbi5jYWxsKHNlbGYsIGN0eCk7XG4gICAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgY3R4LnN0b3JlZEV4Y2VwdGlvbiA9IGV4O1xuICAgICAgICAgIHZhciBsYXN0ID0gY3R4LnRyeVN0YWNrX1tjdHgudHJ5U3RhY2tfLmxlbmd0aCAtIDFdO1xuICAgICAgICAgIGlmICghbGFzdCkge1xuICAgICAgICAgICAgY3R4LkdTdGF0ZSA9IFNUX0NMT1NFRDtcbiAgICAgICAgICAgIGN0eC5zdGF0ZSA9IEVORF9TVEFURTtcbiAgICAgICAgICAgIHRocm93IGV4O1xuICAgICAgICAgIH1cbiAgICAgICAgICBjdHguc3RhdGUgPSBsYXN0LmNhdGNoICE9PSB1bmRlZmluZWQgPyBsYXN0LmNhdGNoIDogbGFzdC5maW5hbGx5O1xuICAgICAgICAgIGlmIChsYXN0LmZpbmFsbHlGYWxsVGhyb3VnaCAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgY3R4LmZpbmFsbHlGYWxsVGhyb3VnaCA9IGxhc3QuZmluYWxseUZhbGxUaHJvdWdoO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBzZXR1cEdsb2JhbHMoZ2xvYmFsKSB7XG4gICAgZ2xvYmFsLlN5bWJvbCA9IFN5bWJvbDtcbiAgICBwb2x5ZmlsbE9iamVjdChnbG9iYWwuT2JqZWN0KTtcbiAgfVxuICBzZXR1cEdsb2JhbHMoZ2xvYmFsKTtcbiAgZ2xvYmFsLiR0cmFjZXVyUnVudGltZSA9IHtcbiAgICBhc3luY1dyYXA6IGFzeW5jV3JhcCxcbiAgICBjcmVhdGVDbGFzczogY3JlYXRlQ2xhc3MsXG4gICAgZGVmYXVsdFN1cGVyQ2FsbDogZGVmYXVsdFN1cGVyQ2FsbCxcbiAgICBleHBvcnRTdGFyOiBleHBvcnRTdGFyLFxuICAgIGdlbmVyYXRvcldyYXA6IGdlbmVyYXRvcldyYXAsXG4gICAgc2V0UHJvcGVydHk6IHNldFByb3BlcnR5LFxuICAgIHNldHVwR2xvYmFsczogc2V0dXBHbG9iYWxzLFxuICAgIHNwcmVhZDogc3ByZWFkLFxuICAgIHN1cGVyQ2FsbDogc3VwZXJDYWxsLFxuICAgIHN1cGVyR2V0OiBzdXBlckdldCxcbiAgICBzdXBlclNldDogc3VwZXJTZXQsXG4gICAgdG9PYmplY3Q6IHRvT2JqZWN0LFxuICAgIHRvUHJvcGVydHk6IHRvUHJvcGVydHksXG4gICAgdHlwZTogdHlwZXMsXG4gICAgdHlwZW9mOiB0eXBlT2ZcbiAgfTtcbn0pKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogdGhpcyk7XG4oZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIGJ1aWxkRnJvbUVuY29kZWRQYXJ0cyhvcHRfc2NoZW1lLCBvcHRfdXNlckluZm8sIG9wdF9kb21haW4sIG9wdF9wb3J0LCBvcHRfcGF0aCwgb3B0X3F1ZXJ5RGF0YSwgb3B0X2ZyYWdtZW50KSB7XG4gICAgdmFyIG91dCA9IFtdO1xuICAgIGlmIChvcHRfc2NoZW1lKSB7XG4gICAgICBvdXQucHVzaChvcHRfc2NoZW1lLCAnOicpO1xuICAgIH1cbiAgICBpZiAob3B0X2RvbWFpbikge1xuICAgICAgb3V0LnB1c2goJy8vJyk7XG4gICAgICBpZiAob3B0X3VzZXJJbmZvKSB7XG4gICAgICAgIG91dC5wdXNoKG9wdF91c2VySW5mbywgJ0AnKTtcbiAgICAgIH1cbiAgICAgIG91dC5wdXNoKG9wdF9kb21haW4pO1xuICAgICAgaWYgKG9wdF9wb3J0KSB7XG4gICAgICAgIG91dC5wdXNoKCc6Jywgb3B0X3BvcnQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAob3B0X3BhdGgpIHtcbiAgICAgIG91dC5wdXNoKG9wdF9wYXRoKTtcbiAgICB9XG4gICAgaWYgKG9wdF9xdWVyeURhdGEpIHtcbiAgICAgIG91dC5wdXNoKCc/Jywgb3B0X3F1ZXJ5RGF0YSk7XG4gICAgfVxuICAgIGlmIChvcHRfZnJhZ21lbnQpIHtcbiAgICAgIG91dC5wdXNoKCcjJywgb3B0X2ZyYWdtZW50KTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKCcnKTtcbiAgfVxuICA7XG4gIHZhciBzcGxpdFJlID0gbmV3IFJlZ0V4cCgnXicgKyAnKD86JyArICcoW146Lz8jLl0rKScgKyAnOik/JyArICcoPzovLycgKyAnKD86KFteLz8jXSopQCk/JyArICcoW1xcXFx3XFxcXGRcXFxcLVxcXFx1MDEwMC1cXFxcdWZmZmYuJV0qKScgKyAnKD86OihbMC05XSspKT8nICsgJyk/JyArICcoW14/I10rKT8nICsgJyg/OlxcXFw/KFteI10qKSk/JyArICcoPzojKC4qKSk/JyArICckJyk7XG4gIHZhciBDb21wb25lbnRJbmRleCA9IHtcbiAgICBTQ0hFTUU6IDEsXG4gICAgVVNFUl9JTkZPOiAyLFxuICAgIERPTUFJTjogMyxcbiAgICBQT1JUOiA0LFxuICAgIFBBVEg6IDUsXG4gICAgUVVFUllfREFUQTogNixcbiAgICBGUkFHTUVOVDogN1xuICB9O1xuICBmdW5jdGlvbiBzcGxpdCh1cmkpIHtcbiAgICByZXR1cm4gKHVyaS5tYXRjaChzcGxpdFJlKSk7XG4gIH1cbiAgZnVuY3Rpb24gcmVtb3ZlRG90U2VnbWVudHMocGF0aCkge1xuICAgIGlmIChwYXRoID09PSAnLycpXG4gICAgICByZXR1cm4gJy8nO1xuICAgIHZhciBsZWFkaW5nU2xhc2ggPSBwYXRoWzBdID09PSAnLycgPyAnLycgOiAnJztcbiAgICB2YXIgdHJhaWxpbmdTbGFzaCA9IHBhdGguc2xpY2UoLTEpID09PSAnLycgPyAnLycgOiAnJztcbiAgICB2YXIgc2VnbWVudHMgPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgdmFyIG91dCA9IFtdO1xuICAgIHZhciB1cCA9IDA7XG4gICAgZm9yICh2YXIgcG9zID0gMDsgcG9zIDwgc2VnbWVudHMubGVuZ3RoOyBwb3MrKykge1xuICAgICAgdmFyIHNlZ21lbnQgPSBzZWdtZW50c1twb3NdO1xuICAgICAgc3dpdGNoIChzZWdtZW50KSB7XG4gICAgICAgIGNhc2UgJyc6XG4gICAgICAgIGNhc2UgJy4nOlxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICcuLic6XG4gICAgICAgICAgaWYgKG91dC5sZW5ndGgpXG4gICAgICAgICAgICBvdXQucG9wKCk7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgdXArKztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBvdXQucHVzaChzZWdtZW50KTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFsZWFkaW5nU2xhc2gpIHtcbiAgICAgIHdoaWxlICh1cC0tID4gMCkge1xuICAgICAgICBvdXQudW5zaGlmdCgnLi4nKTtcbiAgICAgIH1cbiAgICAgIGlmIChvdXQubGVuZ3RoID09PSAwKVxuICAgICAgICBvdXQucHVzaCgnLicpO1xuICAgIH1cbiAgICByZXR1cm4gbGVhZGluZ1NsYXNoICsgb3V0LmpvaW4oJy8nKSArIHRyYWlsaW5nU2xhc2g7XG4gIH1cbiAgZnVuY3Rpb24gam9pbkFuZENhbm9uaWNhbGl6ZVBhdGgocGFydHMpIHtcbiAgICB2YXIgcGF0aCA9IHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdIHx8ICcnO1xuICAgIHBhdGggPSByZW1vdmVEb3RTZWdtZW50cyhwYXRoKTtcbiAgICBwYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXSA9IHBhdGg7XG4gICAgcmV0dXJuIGJ1aWxkRnJvbUVuY29kZWRQYXJ0cyhwYXJ0c1tDb21wb25lbnRJbmRleC5TQ0hFTUVdLCBwYXJ0c1tDb21wb25lbnRJbmRleC5VU0VSX0lORk9dLCBwYXJ0c1tDb21wb25lbnRJbmRleC5ET01BSU5dLCBwYXJ0c1tDb21wb25lbnRJbmRleC5QT1JUXSwgcGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF0sIHBhcnRzW0NvbXBvbmVudEluZGV4LlFVRVJZX0RBVEFdLCBwYXJ0c1tDb21wb25lbnRJbmRleC5GUkFHTUVOVF0pO1xuICB9XG4gIGZ1bmN0aW9uIGNhbm9uaWNhbGl6ZVVybCh1cmwpIHtcbiAgICB2YXIgcGFydHMgPSBzcGxpdCh1cmwpO1xuICAgIHJldHVybiBqb2luQW5kQ2Fub25pY2FsaXplUGF0aChwYXJ0cyk7XG4gIH1cbiAgZnVuY3Rpb24gcmVzb2x2ZVVybChiYXNlLCB1cmwpIHtcbiAgICB2YXIgcGFydHMgPSBzcGxpdCh1cmwpO1xuICAgIHZhciBiYXNlUGFydHMgPSBzcGxpdChiYXNlKTtcbiAgICBpZiAocGFydHNbQ29tcG9uZW50SW5kZXguU0NIRU1FXSkge1xuICAgICAgcmV0dXJuIGpvaW5BbmRDYW5vbmljYWxpemVQYXRoKHBhcnRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFydHNbQ29tcG9uZW50SW5kZXguU0NIRU1FXSA9IGJhc2VQYXJ0c1tDb21wb25lbnRJbmRleC5TQ0hFTUVdO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gQ29tcG9uZW50SW5kZXguU0NIRU1FOyBpIDw9IENvbXBvbmVudEluZGV4LlBPUlQ7IGkrKykge1xuICAgICAgaWYgKCFwYXJ0c1tpXSkge1xuICAgICAgICBwYXJ0c1tpXSA9IGJhc2VQYXJ0c1tpXTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdWzBdID09ICcvJykge1xuICAgICAgcmV0dXJuIGpvaW5BbmRDYW5vbmljYWxpemVQYXRoKHBhcnRzKTtcbiAgICB9XG4gICAgdmFyIHBhdGggPSBiYXNlUGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF07XG4gICAgdmFyIGluZGV4ID0gcGF0aC5sYXN0SW5kZXhPZignLycpO1xuICAgIHBhdGggPSBwYXRoLnNsaWNlKDAsIGluZGV4ICsgMSkgKyBwYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXTtcbiAgICBwYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXSA9IHBhdGg7XG4gICAgcmV0dXJuIGpvaW5BbmRDYW5vbmljYWxpemVQYXRoKHBhcnRzKTtcbiAgfVxuICBmdW5jdGlvbiBpc0Fic29sdXRlKG5hbWUpIHtcbiAgICBpZiAoIW5hbWUpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgaWYgKG5hbWVbMF0gPT09ICcvJylcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIHZhciBwYXJ0cyA9IHNwbGl0KG5hbWUpO1xuICAgIGlmIChwYXJ0c1tDb21wb25lbnRJbmRleC5TQ0hFTUVdKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gICR0cmFjZXVyUnVudGltZS5jYW5vbmljYWxpemVVcmwgPSBjYW5vbmljYWxpemVVcmw7XG4gICR0cmFjZXVyUnVudGltZS5pc0Fic29sdXRlID0gaXNBYnNvbHV0ZTtcbiAgJHRyYWNldXJSdW50aW1lLnJlbW92ZURvdFNlZ21lbnRzID0gcmVtb3ZlRG90U2VnbWVudHM7XG4gICR0cmFjZXVyUnVudGltZS5yZXNvbHZlVXJsID0gcmVzb2x2ZVVybDtcbn0pKCk7XG4oZnVuY3Rpb24oZ2xvYmFsKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyICRfXzIgPSAkdHJhY2V1clJ1bnRpbWUsXG4gICAgICBjYW5vbmljYWxpemVVcmwgPSAkX18yLmNhbm9uaWNhbGl6ZVVybCxcbiAgICAgIHJlc29sdmVVcmwgPSAkX18yLnJlc29sdmVVcmwsXG4gICAgICBpc0Fic29sdXRlID0gJF9fMi5pc0Fic29sdXRlO1xuICB2YXIgbW9kdWxlSW5zdGFudGlhdG9ycyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIHZhciBiYXNlVVJMO1xuICBpZiAoZ2xvYmFsLmxvY2F0aW9uICYmIGdsb2JhbC5sb2NhdGlvbi5ocmVmKVxuICAgIGJhc2VVUkwgPSByZXNvbHZlVXJsKGdsb2JhbC5sb2NhdGlvbi5ocmVmLCAnLi8nKTtcbiAgZWxzZVxuICAgIGJhc2VVUkwgPSAnJztcbiAgdmFyIFVuY29hdGVkTW9kdWxlRW50cnkgPSBmdW5jdGlvbiBVbmNvYXRlZE1vZHVsZUVudHJ5KHVybCwgdW5jb2F0ZWRNb2R1bGUpIHtcbiAgICB0aGlzLnVybCA9IHVybDtcbiAgICB0aGlzLnZhbHVlXyA9IHVuY29hdGVkTW9kdWxlO1xuICB9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShVbmNvYXRlZE1vZHVsZUVudHJ5LCB7fSwge30pO1xuICB2YXIgVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IgPSBmdW5jdGlvbiBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcih1cmwsIGZ1bmMpIHtcbiAgICAkdHJhY2V1clJ1bnRpbWUuc3VwZXJDYWxsKHRoaXMsICRVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvci5wcm90b3R5cGUsIFwiY29uc3RydWN0b3JcIiwgW3VybCwgbnVsbF0pO1xuICAgIHRoaXMuZnVuYyA9IGZ1bmM7XG4gIH07XG4gIHZhciAkVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IgPSBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcjtcbiAgKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IsIHtnZXRVbmNvYXRlZE1vZHVsZTogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy52YWx1ZV8pXG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlXztcbiAgICAgIHJldHVybiB0aGlzLnZhbHVlXyA9IHRoaXMuZnVuYy5jYWxsKGdsb2JhbCk7XG4gICAgfX0sIHt9LCBVbmNvYXRlZE1vZHVsZUVudHJ5KTtcbiAgZnVuY3Rpb24gZ2V0VW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IobmFtZSkge1xuICAgIGlmICghbmFtZSlcbiAgICAgIHJldHVybjtcbiAgICB2YXIgdXJsID0gTW9kdWxlU3RvcmUubm9ybWFsaXplKG5hbWUpO1xuICAgIHJldHVybiBtb2R1bGVJbnN0YW50aWF0b3JzW3VybF07XG4gIH1cbiAgO1xuICB2YXIgbW9kdWxlSW5zdGFuY2VzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgdmFyIGxpdmVNb2R1bGVTZW50aW5lbCA9IHt9O1xuICBmdW5jdGlvbiBNb2R1bGUodW5jb2F0ZWRNb2R1bGUpIHtcbiAgICB2YXIgaXNMaXZlID0gYXJndW1lbnRzWzFdO1xuICAgIHZhciBjb2F0ZWRNb2R1bGUgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHVuY29hdGVkTW9kdWxlKS5mb3JFYWNoKChmdW5jdGlvbihuYW1lKSB7XG4gICAgICB2YXIgZ2V0dGVyLFxuICAgICAgICAgIHZhbHVlO1xuICAgICAgaWYgKGlzTGl2ZSA9PT0gbGl2ZU1vZHVsZVNlbnRpbmVsKSB7XG4gICAgICAgIHZhciBkZXNjciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodW5jb2F0ZWRNb2R1bGUsIG5hbWUpO1xuICAgICAgICBpZiAoZGVzY3IuZ2V0KVxuICAgICAgICAgIGdldHRlciA9IGRlc2NyLmdldDtcbiAgICAgIH1cbiAgICAgIGlmICghZ2V0dGVyKSB7XG4gICAgICAgIHZhbHVlID0gdW5jb2F0ZWRNb2R1bGVbbmFtZV07XG4gICAgICAgIGdldHRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb2F0ZWRNb2R1bGUsIG5hbWUsIHtcbiAgICAgICAgZ2V0OiBnZXR0ZXIsXG4gICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgIH0pO1xuICAgIH0pKTtcbiAgICBPYmplY3QucHJldmVudEV4dGVuc2lvbnMoY29hdGVkTW9kdWxlKTtcbiAgICByZXR1cm4gY29hdGVkTW9kdWxlO1xuICB9XG4gIHZhciBNb2R1bGVTdG9yZSA9IHtcbiAgICBub3JtYWxpemU6IGZ1bmN0aW9uKG5hbWUsIHJlZmVyZXJOYW1lLCByZWZlcmVyQWRkcmVzcykge1xuICAgICAgaWYgKHR5cGVvZiBuYW1lICE9PSBcInN0cmluZ1wiKVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwibW9kdWxlIG5hbWUgbXVzdCBiZSBhIHN0cmluZywgbm90IFwiICsgdHlwZW9mIG5hbWUpO1xuICAgICAgaWYgKGlzQWJzb2x1dGUobmFtZSkpXG4gICAgICAgIHJldHVybiBjYW5vbmljYWxpemVVcmwobmFtZSk7XG4gICAgICBpZiAoL1teXFwuXVxcL1xcLlxcLlxcLy8udGVzdChuYW1lKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ21vZHVsZSBuYW1lIGVtYmVkcyAvLi4vOiAnICsgbmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAobmFtZVswXSA9PT0gJy4nICYmIHJlZmVyZXJOYW1lKVxuICAgICAgICByZXR1cm4gcmVzb2x2ZVVybChyZWZlcmVyTmFtZSwgbmFtZSk7XG4gICAgICByZXR1cm4gY2Fub25pY2FsaXplVXJsKG5hbWUpO1xuICAgIH0sXG4gICAgZ2V0OiBmdW5jdGlvbihub3JtYWxpemVkTmFtZSkge1xuICAgICAgdmFyIG0gPSBnZXRVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihub3JtYWxpemVkTmFtZSk7XG4gICAgICBpZiAoIW0pXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB2YXIgbW9kdWxlSW5zdGFuY2UgPSBtb2R1bGVJbnN0YW5jZXNbbS51cmxdO1xuICAgICAgaWYgKG1vZHVsZUluc3RhbmNlKVxuICAgICAgICByZXR1cm4gbW9kdWxlSW5zdGFuY2U7XG4gICAgICBtb2R1bGVJbnN0YW5jZSA9IE1vZHVsZShtLmdldFVuY29hdGVkTW9kdWxlKCksIGxpdmVNb2R1bGVTZW50aW5lbCk7XG4gICAgICByZXR1cm4gbW9kdWxlSW5zdGFuY2VzW20udXJsXSA9IG1vZHVsZUluc3RhbmNlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihub3JtYWxpemVkTmFtZSwgbW9kdWxlKSB7XG4gICAgICBub3JtYWxpemVkTmFtZSA9IFN0cmluZyhub3JtYWxpemVkTmFtZSk7XG4gICAgICBtb2R1bGVJbnN0YW50aWF0b3JzW25vcm1hbGl6ZWROYW1lXSA9IG5ldyBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihub3JtYWxpemVkTmFtZSwgKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbW9kdWxlO1xuICAgICAgfSkpO1xuICAgICAgbW9kdWxlSW5zdGFuY2VzW25vcm1hbGl6ZWROYW1lXSA9IG1vZHVsZTtcbiAgICB9LFxuICAgIGdldCBiYXNlVVJMKCkge1xuICAgICAgcmV0dXJuIGJhc2VVUkw7XG4gICAgfSxcbiAgICBzZXQgYmFzZVVSTCh2KSB7XG4gICAgICBiYXNlVVJMID0gU3RyaW5nKHYpO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJNb2R1bGU6IGZ1bmN0aW9uKG5hbWUsIGZ1bmMpIHtcbiAgICAgIHZhciBub3JtYWxpemVkTmFtZSA9IE1vZHVsZVN0b3JlLm5vcm1hbGl6ZShuYW1lKTtcbiAgICAgIGlmIChtb2R1bGVJbnN0YW50aWF0b3JzW25vcm1hbGl6ZWROYW1lXSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdkdXBsaWNhdGUgbW9kdWxlIG5hbWVkICcgKyBub3JtYWxpemVkTmFtZSk7XG4gICAgICBtb2R1bGVJbnN0YW50aWF0b3JzW25vcm1hbGl6ZWROYW1lXSA9IG5ldyBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihub3JtYWxpemVkTmFtZSwgZnVuYyk7XG4gICAgfSxcbiAgICBidW5kbGVTdG9yZTogT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICByZWdpc3RlcjogZnVuY3Rpb24obmFtZSwgZGVwcywgZnVuYykge1xuICAgICAgaWYgKCFkZXBzIHx8ICFkZXBzLmxlbmd0aCkge1xuICAgICAgICB0aGlzLnJlZ2lzdGVyTW9kdWxlKG5hbWUsIGZ1bmMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5idW5kbGVTdG9yZVtuYW1lXSA9IHtcbiAgICAgICAgICBkZXBzOiBkZXBzLFxuICAgICAgICAgIGV4ZWN1dGU6IGZ1bmNcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGdldEFub255bW91c01vZHVsZTogZnVuY3Rpb24oZnVuYykge1xuICAgICAgcmV0dXJuIG5ldyBNb2R1bGUoZnVuYy5jYWxsKGdsb2JhbCksIGxpdmVNb2R1bGVTZW50aW5lbCk7XG4gICAgfSxcbiAgICBnZXRGb3JUZXN0aW5nOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgICBpZiAoIXRoaXMudGVzdGluZ1ByZWZpeF8pIHtcbiAgICAgICAgT2JqZWN0LmtleXMobW9kdWxlSW5zdGFuY2VzKS5zb21lKChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICB2YXIgbSA9IC8odHJhY2V1ckBbXlxcL10qXFwvKS8uZXhlYyhrZXkpO1xuICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAkX18wLnRlc3RpbmdQcmVmaXhfID0gbVsxXTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZ2V0KHRoaXMudGVzdGluZ1ByZWZpeF8gKyBuYW1lKTtcbiAgICB9XG4gIH07XG4gIE1vZHVsZVN0b3JlLnNldCgnQHRyYWNldXIvc3JjL3J1bnRpbWUvTW9kdWxlU3RvcmUnLCBuZXcgTW9kdWxlKHtNb2R1bGVTdG9yZTogTW9kdWxlU3RvcmV9KSk7XG4gIHZhciBzZXR1cEdsb2JhbHMgPSAkdHJhY2V1clJ1bnRpbWUuc2V0dXBHbG9iYWxzO1xuICAkdHJhY2V1clJ1bnRpbWUuc2V0dXBHbG9iYWxzID0gZnVuY3Rpb24oZ2xvYmFsKSB7XG4gICAgc2V0dXBHbG9iYWxzKGdsb2JhbCk7XG4gIH07XG4gICR0cmFjZXVyUnVudGltZS5Nb2R1bGVTdG9yZSA9IE1vZHVsZVN0b3JlO1xuICBnbG9iYWwuU3lzdGVtID0ge1xuICAgIHJlZ2lzdGVyOiBNb2R1bGVTdG9yZS5yZWdpc3Rlci5iaW5kKE1vZHVsZVN0b3JlKSxcbiAgICBnZXQ6IE1vZHVsZVN0b3JlLmdldCxcbiAgICBzZXQ6IE1vZHVsZVN0b3JlLnNldCxcbiAgICBub3JtYWxpemU6IE1vZHVsZVN0b3JlLm5vcm1hbGl6ZVxuICB9O1xuICAkdHJhY2V1clJ1bnRpbWUuZ2V0TW9kdWxlSW1wbCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgaW5zdGFudGlhdG9yID0gZ2V0VW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IobmFtZSk7XG4gICAgcmV0dXJuIGluc3RhbnRpYXRvciAmJiBpbnN0YW50aWF0b3IuZ2V0VW5jb2F0ZWRNb2R1bGUoKTtcbiAgfTtcbn0pKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogdGhpcyk7XG5TeXN0ZW0ucmVnaXN0ZXIoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlsc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlsc1wiO1xuICB2YXIgdG9PYmplY3QgPSAkdHJhY2V1clJ1bnRpbWUudG9PYmplY3Q7XG4gIGZ1bmN0aW9uIHRvVWludDMyKHgpIHtcbiAgICByZXR1cm4geCB8IDA7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBnZXQgdG9PYmplY3QoKSB7XG4gICAgICByZXR1cm4gdG9PYmplY3Q7XG4gICAgfSxcbiAgICBnZXQgdG9VaW50MzIoKSB7XG4gICAgICByZXR1cm4gdG9VaW50MzI7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0ucmVnaXN0ZXIoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy9BcnJheUl0ZXJhdG9yXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciAkX180O1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy9BcnJheUl0ZXJhdG9yXCI7XG4gIHZhciAkX181ID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzXCIpLFxuICAgICAgdG9PYmplY3QgPSAkX181LnRvT2JqZWN0LFxuICAgICAgdG9VaW50MzIgPSAkX181LnRvVWludDMyO1xuICB2YXIgQVJSQVlfSVRFUkFUT1JfS0lORF9LRVlTID0gMTtcbiAgdmFyIEFSUkFZX0lURVJBVE9SX0tJTkRfVkFMVUVTID0gMjtcbiAgdmFyIEFSUkFZX0lURVJBVE9SX0tJTkRfRU5UUklFUyA9IDM7XG4gIHZhciBBcnJheUl0ZXJhdG9yID0gZnVuY3Rpb24gQXJyYXlJdGVyYXRvcigpIHt9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShBcnJheUl0ZXJhdG9yLCAoJF9fNCA9IHt9LCBPYmplY3QuZGVmaW5lUHJvcGVydHkoJF9fNCwgXCJuZXh0XCIsIHtcbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaXRlcmF0b3IgPSB0b09iamVjdCh0aGlzKTtcbiAgICAgIHZhciBhcnJheSA9IGl0ZXJhdG9yLml0ZXJhdG9yT2JqZWN0XztcbiAgICAgIGlmICghYXJyYXkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignT2JqZWN0IGlzIG5vdCBhbiBBcnJheUl0ZXJhdG9yJyk7XG4gICAgICB9XG4gICAgICB2YXIgaW5kZXggPSBpdGVyYXRvci5hcnJheUl0ZXJhdG9yTmV4dEluZGV4XztcbiAgICAgIHZhciBpdGVtS2luZCA9IGl0ZXJhdG9yLmFycmF5SXRlcmF0aW9uS2luZF87XG4gICAgICB2YXIgbGVuZ3RoID0gdG9VaW50MzIoYXJyYXkubGVuZ3RoKTtcbiAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgaXRlcmF0b3IuYXJyYXlJdGVyYXRvck5leHRJbmRleF8gPSBJbmZpbml0eTtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KHVuZGVmaW5lZCwgdHJ1ZSk7XG4gICAgICB9XG4gICAgICBpdGVyYXRvci5hcnJheUl0ZXJhdG9yTmV4dEluZGV4XyA9IGluZGV4ICsgMTtcbiAgICAgIGlmIChpdGVtS2luZCA9PSBBUlJBWV9JVEVSQVRPUl9LSU5EX1ZBTFVFUylcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KGFycmF5W2luZGV4XSwgZmFsc2UpO1xuICAgICAgaWYgKGl0ZW1LaW5kID09IEFSUkFZX0lURVJBVE9SX0tJTkRfRU5UUklFUylcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KFtpbmRleCwgYXJyYXlbaW5kZXhdXSwgZmFsc2UpO1xuICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KGluZGV4LCBmYWxzZSk7XG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZVxuICB9KSwgT2JqZWN0LmRlZmluZVByb3BlcnR5KCRfXzQsIFN5bWJvbC5pdGVyYXRvciwge1xuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWVcbiAgfSksICRfXzQpLCB7fSk7XG4gIGZ1bmN0aW9uIGNyZWF0ZUFycmF5SXRlcmF0b3IoYXJyYXksIGtpbmQpIHtcbiAgICB2YXIgb2JqZWN0ID0gdG9PYmplY3QoYXJyYXkpO1xuICAgIHZhciBpdGVyYXRvciA9IG5ldyBBcnJheUl0ZXJhdG9yO1xuICAgIGl0ZXJhdG9yLml0ZXJhdG9yT2JqZWN0XyA9IG9iamVjdDtcbiAgICBpdGVyYXRvci5hcnJheUl0ZXJhdG9yTmV4dEluZGV4XyA9IDA7XG4gICAgaXRlcmF0b3IuYXJyYXlJdGVyYXRpb25LaW5kXyA9IGtpbmQ7XG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xuICB9XG4gIGZ1bmN0aW9uIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KHZhbHVlLCBkb25lKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgIGRvbmU6IGRvbmVcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIGVudHJpZXMoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUFycmF5SXRlcmF0b3IodGhpcywgQVJSQVlfSVRFUkFUT1JfS0lORF9FTlRSSUVTKTtcbiAgfVxuICBmdW5jdGlvbiBrZXlzKCkge1xuICAgIHJldHVybiBjcmVhdGVBcnJheUl0ZXJhdG9yKHRoaXMsIEFSUkFZX0lURVJBVE9SX0tJTkRfS0VZUyk7XG4gIH1cbiAgZnVuY3Rpb24gdmFsdWVzKCkge1xuICAgIHJldHVybiBjcmVhdGVBcnJheUl0ZXJhdG9yKHRoaXMsIEFSUkFZX0lURVJBVE9SX0tJTkRfVkFMVUVTKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGdldCBlbnRyaWVzKCkge1xuICAgICAgcmV0dXJuIGVudHJpZXM7XG4gICAgfSxcbiAgICBnZXQga2V5cygpIHtcbiAgICAgIHJldHVybiBrZXlzO1xuICAgIH0sXG4gICAgZ2V0IHZhbHVlcygpIHtcbiAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0ucmVnaXN0ZXIoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL25vZGVfbW9kdWxlcy9yc3ZwL2xpYi9yc3ZwL2FzYXBcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9ub2RlX21vZHVsZXMvcnN2cC9saWIvcnN2cC9hc2FwXCI7XG4gIHZhciAkX19kZWZhdWx0ID0gZnVuY3Rpb24gYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gICAgdmFyIGxlbmd0aCA9IHF1ZXVlLnB1c2goW2NhbGxiYWNrLCBhcmddKTtcbiAgICBpZiAobGVuZ3RoID09PSAxKSB7XG4gICAgICBzY2hlZHVsZUZsdXNoKCk7XG4gICAgfVxuICB9O1xuICB2YXIgYnJvd3Nlckdsb2JhbCA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgPyB3aW5kb3cgOiB7fTtcbiAgdmFyIEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID0gYnJvd3Nlckdsb2JhbC5NdXRhdGlvbk9ic2VydmVyIHx8IGJyb3dzZXJHbG9iYWwuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcbiAgZnVuY3Rpb24gdXNlTmV4dFRpY2soKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcHJvY2Vzcy5uZXh0VGljayhmbHVzaCk7XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiB1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoZmx1c2gpO1xuICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgIG9ic2VydmVyLm9ic2VydmUobm9kZSwge2NoYXJhY3RlckRhdGE6IHRydWV9KTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBub2RlLmRhdGEgPSAoaXRlcmF0aW9ucyA9ICsraXRlcmF0aW9ucyAlIDIpO1xuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gdXNlU2V0VGltZW91dCgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBzZXRUaW1lb3V0KGZsdXNoLCAxKTtcbiAgICB9O1xuICB9XG4gIHZhciBxdWV1ZSA9IFtdO1xuICBmdW5jdGlvbiBmbHVzaCgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHF1ZXVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdHVwbGUgPSBxdWV1ZVtpXTtcbiAgICAgIHZhciBjYWxsYmFjayA9IHR1cGxlWzBdLFxuICAgICAgICAgIGFyZyA9IHR1cGxlWzFdO1xuICAgICAgY2FsbGJhY2soYXJnKTtcbiAgICB9XG4gICAgcXVldWUgPSBbXTtcbiAgfVxuICB2YXIgc2NoZWR1bGVGbHVzaDtcbiAgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXScpIHtcbiAgICBzY2hlZHVsZUZsdXNoID0gdXNlTmV4dFRpY2soKTtcbiAgfSBlbHNlIGlmIChCcm93c2VyTXV0YXRpb25PYnNlcnZlcikge1xuICAgIHNjaGVkdWxlRmx1c2ggPSB1c2VNdXRhdGlvbk9ic2VydmVyKCk7XG4gIH0gZWxzZSB7XG4gICAgc2NoZWR1bGVGbHVzaCA9IHVzZVNldFRpbWVvdXQoKTtcbiAgfVxuICByZXR1cm4ge2dldCBkZWZhdWx0KCkge1xuICAgICAgcmV0dXJuICRfX2RlZmF1bHQ7XG4gICAgfX07XG59KTtcblN5c3RlbS5yZWdpc3RlcihcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1Byb21pc2VcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9zcmMvcnVudGltZS9wb2x5ZmlsbHMvUHJvbWlzZVwiO1xuICB2YXIgYXN5bmMgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9ub2RlX21vZHVsZXMvcnN2cC9saWIvcnN2cC9hc2FwXCIpLmRlZmF1bHQ7XG4gIGZ1bmN0aW9uIGlzUHJvbWlzZSh4KSB7XG4gICAgcmV0dXJuIHggJiYgdHlwZW9mIHggPT09ICdvYmplY3QnICYmIHguc3RhdHVzXyAhPT0gdW5kZWZpbmVkO1xuICB9XG4gIGZ1bmN0aW9uIGNoYWluKHByb21pc2UpIHtcbiAgICB2YXIgb25SZXNvbHZlID0gYXJndW1lbnRzWzFdICE9PSAodm9pZCAwKSA/IGFyZ3VtZW50c1sxXSA6IChmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4geDtcbiAgICB9KTtcbiAgICB2YXIgb25SZWplY3QgPSBhcmd1bWVudHNbMl0gIT09ICh2b2lkIDApID8gYXJndW1lbnRzWzJdIDogKGZ1bmN0aW9uKGUpIHtcbiAgICAgIHRocm93IGU7XG4gICAgfSk7XG4gICAgdmFyIGRlZmVycmVkID0gZ2V0RGVmZXJyZWQocHJvbWlzZS5jb25zdHJ1Y3Rvcik7XG4gICAgc3dpdGNoIChwcm9taXNlLnN0YXR1c18pIHtcbiAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICB0aHJvdyBUeXBlRXJyb3I7XG4gICAgICBjYXNlICdwZW5kaW5nJzpcbiAgICAgICAgcHJvbWlzZS5vblJlc29sdmVfLnB1c2goW2RlZmVycmVkLCBvblJlc29sdmVdKTtcbiAgICAgICAgcHJvbWlzZS5vblJlamVjdF8ucHVzaChbZGVmZXJyZWQsIG9uUmVqZWN0XSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncmVzb2x2ZWQnOlxuICAgICAgICBwcm9taXNlUmVhY3QoZGVmZXJyZWQsIG9uUmVzb2x2ZSwgcHJvbWlzZS52YWx1ZV8pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3JlamVjdGVkJzpcbiAgICAgICAgcHJvbWlzZVJlYWN0KGRlZmVycmVkLCBvblJlamVjdCwgcHJvbWlzZS52YWx1ZV8pO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0RGVmZXJyZWQoQykge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICByZXN1bHQucHJvbWlzZSA9IG5ldyBDKChmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlc3VsdC5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIHJlc3VsdC5yZWplY3QgPSByZWplY3Q7XG4gICAgfSkpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgdmFyIFByb21pc2UgPSBmdW5jdGlvbiBQcm9taXNlKHJlc29sdmVyKSB7XG4gICAgdmFyICRfXzYgPSB0aGlzO1xuICAgIHRoaXMuc3RhdHVzXyA9ICdwZW5kaW5nJztcbiAgICB0aGlzLm9uUmVzb2x2ZV8gPSBbXTtcbiAgICB0aGlzLm9uUmVqZWN0XyA9IFtdO1xuICAgIHJlc29sdmVyKChmdW5jdGlvbih4KSB7XG4gICAgICBwcm9taXNlUmVzb2x2ZSgkX182LCB4KTtcbiAgICB9KSwgKGZ1bmN0aW9uKHIpIHtcbiAgICAgIHByb21pc2VSZWplY3QoJF9fNiwgcik7XG4gICAgfSkpO1xuICB9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShQcm9taXNlLCB7XG4gICAgY2F0Y2g6IGZ1bmN0aW9uKG9uUmVqZWN0KSB7XG4gICAgICByZXR1cm4gdGhpcy50aGVuKHVuZGVmaW5lZCwgb25SZWplY3QpO1xuICAgIH0sXG4gICAgdGhlbjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgb25SZXNvbHZlID0gYXJndW1lbnRzWzBdICE9PSAodm9pZCAwKSA/IGFyZ3VtZW50c1swXSA6IChmdW5jdGlvbih4KSB7XG4gICAgICAgIHJldHVybiB4O1xuICAgICAgfSk7XG4gICAgICB2YXIgb25SZWplY3QgPSBhcmd1bWVudHNbMV07XG4gICAgICB2YXIgJF9fNiA9IHRoaXM7XG4gICAgICB2YXIgY29uc3RydWN0b3IgPSB0aGlzLmNvbnN0cnVjdG9yO1xuICAgICAgcmV0dXJuIGNoYWluKHRoaXMsIChmdW5jdGlvbih4KSB7XG4gICAgICAgIHggPSBwcm9taXNlQ29lcmNlKGNvbnN0cnVjdG9yLCB4KTtcbiAgICAgICAgcmV0dXJuIHggPT09ICRfXzYgPyBvblJlamVjdChuZXcgVHlwZUVycm9yKSA6IGlzUHJvbWlzZSh4KSA/IHgudGhlbihvblJlc29sdmUsIG9uUmVqZWN0KSA6IG9uUmVzb2x2ZSh4KTtcbiAgICAgIH0pLCBvblJlamVjdCk7XG4gICAgfVxuICB9LCB7XG4gICAgcmVzb2x2ZTogZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIG5ldyB0aGlzKChmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgcmVzb2x2ZSh4KTtcbiAgICAgIH0pKTtcbiAgICB9LFxuICAgIHJlamVjdDogZnVuY3Rpb24ocikge1xuICAgICAgcmV0dXJuIG5ldyB0aGlzKChmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgcmVqZWN0KHIpO1xuICAgICAgfSkpO1xuICAgIH0sXG4gICAgY2FzdDogZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKHggaW5zdGFuY2VvZiB0aGlzKVxuICAgICAgICByZXR1cm4geDtcbiAgICAgIGlmIChpc1Byb21pc2UoeCkpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IGdldERlZmVycmVkKHRoaXMpO1xuICAgICAgICBjaGFpbih4LCByZXN1bHQucmVzb2x2ZSwgcmVzdWx0LnJlamVjdCk7XG4gICAgICAgIHJldHVybiByZXN1bHQucHJvbWlzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnJlc29sdmUoeCk7XG4gICAgfSxcbiAgICBhbGw6IGZ1bmN0aW9uKHZhbHVlcykge1xuICAgICAgdmFyIGRlZmVycmVkID0gZ2V0RGVmZXJyZWQodGhpcyk7XG4gICAgICB2YXIgY291bnQgPSAwO1xuICAgICAgdmFyIHJlc29sdXRpb25zID0gW107XG4gICAgICB0cnkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICsrY291bnQ7XG4gICAgICAgICAgdGhpcy5jYXN0KHZhbHVlc1tpXSkudGhlbihmdW5jdGlvbihpLCB4KSB7XG4gICAgICAgICAgICByZXNvbHV0aW9uc1tpXSA9IHg7XG4gICAgICAgICAgICBpZiAoLS1jb3VudCA9PT0gMClcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXNvbHV0aW9ucyk7XG4gICAgICAgICAgfS5iaW5kKHVuZGVmaW5lZCwgaSksIChmdW5jdGlvbihyKSB7XG4gICAgICAgICAgICBpZiAoY291bnQgPiAwKVxuICAgICAgICAgICAgICBjb3VudCA9IDA7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3Qocik7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb3VudCA9PT0gMClcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlc29sdXRpb25zKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfSxcbiAgICByYWNlOiBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgICAgIHZhciBkZWZlcnJlZCA9IGdldERlZmVycmVkKHRoaXMpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB0aGlzLmNhc3QodmFsdWVzW2ldKS50aGVuKChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHgpO1xuICAgICAgICAgIH0pLCAoZnVuY3Rpb24ocikge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHIpO1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9XG4gIH0pO1xuICBmdW5jdGlvbiBwcm9taXNlUmVzb2x2ZShwcm9taXNlLCB4KSB7XG4gICAgcHJvbWlzZURvbmUocHJvbWlzZSwgJ3Jlc29sdmVkJywgeCwgcHJvbWlzZS5vblJlc29sdmVfKTtcbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlUmVqZWN0KHByb21pc2UsIHIpIHtcbiAgICBwcm9taXNlRG9uZShwcm9taXNlLCAncmVqZWN0ZWQnLCByLCBwcm9taXNlLm9uUmVqZWN0Xyk7XG4gIH1cbiAgZnVuY3Rpb24gcHJvbWlzZURvbmUocHJvbWlzZSwgc3RhdHVzLCB2YWx1ZSwgcmVhY3Rpb25zKSB7XG4gICAgaWYgKHByb21pc2Uuc3RhdHVzXyAhPT0gJ3BlbmRpbmcnKVxuICAgICAgcmV0dXJuO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVhY3Rpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBwcm9taXNlUmVhY3QocmVhY3Rpb25zW2ldWzBdLCByZWFjdGlvbnNbaV1bMV0sIHZhbHVlKTtcbiAgICB9XG4gICAgcHJvbWlzZS5zdGF0dXNfID0gc3RhdHVzO1xuICAgIHByb21pc2UudmFsdWVfID0gdmFsdWU7XG4gICAgcHJvbWlzZS5vblJlc29sdmVfID0gcHJvbWlzZS5vblJlamVjdF8gPSB1bmRlZmluZWQ7XG4gIH1cbiAgZnVuY3Rpb24gcHJvbWlzZVJlYWN0KGRlZmVycmVkLCBoYW5kbGVyLCB4KSB7XG4gICAgYXN5bmMoKGZ1bmN0aW9uKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHkgPSBoYW5kbGVyKHgpO1xuICAgICAgICBpZiAoeSA9PT0gZGVmZXJyZWQucHJvbWlzZSlcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICAgICAgICBlbHNlIGlmIChpc1Byb21pc2UoeSkpXG4gICAgICAgICAgY2hhaW4oeSwgZGVmZXJyZWQucmVzb2x2ZSwgZGVmZXJyZWQucmVqZWN0KTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoeSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdChlKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cbiAgdmFyIHRoZW5hYmxlU3ltYm9sID0gJ0BAdGhlbmFibGUnO1xuICBmdW5jdGlvbiBwcm9taXNlQ29lcmNlKGNvbnN0cnVjdG9yLCB4KSB7XG4gICAgaWYgKGlzUHJvbWlzZSh4KSkge1xuICAgICAgcmV0dXJuIHg7XG4gICAgfSBlbHNlIGlmICh4ICYmIHR5cGVvZiB4LnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHZhciBwID0geFt0aGVuYWJsZVN5bWJvbF07XG4gICAgICBpZiAocCkge1xuICAgICAgICByZXR1cm4gcDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBkZWZlcnJlZCA9IGdldERlZmVycmVkKGNvbnN0cnVjdG9yKTtcbiAgICAgICAgeFt0aGVuYWJsZVN5bWJvbF0gPSBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHgudGhlbihkZWZlcnJlZC5yZXNvbHZlLCBkZWZlcnJlZC5yZWplY3QpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4geDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHtnZXQgUHJvbWlzZSgpIHtcbiAgICAgIHJldHVybiBQcm9taXNlO1xuICAgIH19O1xufSk7XG5TeXN0ZW0ucmVnaXN0ZXIoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy9TdHJpbmdcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9zcmMvcnVudGltZS9wb2x5ZmlsbHMvU3RyaW5nXCI7XG4gIHZhciAkdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICB2YXIgJGluZGV4T2YgPSBTdHJpbmcucHJvdG90eXBlLmluZGV4T2Y7XG4gIHZhciAkbGFzdEluZGV4T2YgPSBTdHJpbmcucHJvdG90eXBlLmxhc3RJbmRleE9mO1xuICBmdW5jdGlvbiBzdGFydHNXaXRoKHNlYXJjaCkge1xuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCB8fCAkdG9TdHJpbmcuY2FsbChzZWFyY2gpID09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZ0xlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHNlYXJjaFN0cmluZyA9IFN0cmluZyhzZWFyY2gpO1xuICAgIHZhciBzZWFyY2hMZW5ndGggPSBzZWFyY2hTdHJpbmcubGVuZ3RoO1xuICAgIHZhciBwb3NpdGlvbiA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogdW5kZWZpbmVkO1xuICAgIHZhciBwb3MgPSBwb3NpdGlvbiA/IE51bWJlcihwb3NpdGlvbikgOiAwO1xuICAgIGlmIChpc05hTihwb3MpKSB7XG4gICAgICBwb3MgPSAwO1xuICAgIH1cbiAgICB2YXIgc3RhcnQgPSBNYXRoLm1pbihNYXRoLm1heChwb3MsIDApLCBzdHJpbmdMZW5ndGgpO1xuICAgIHJldHVybiAkaW5kZXhPZi5jYWxsKHN0cmluZywgc2VhcmNoU3RyaW5nLCBwb3MpID09IHN0YXJ0O1xuICB9XG4gIGZ1bmN0aW9uIGVuZHNXaXRoKHNlYXJjaCkge1xuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCB8fCAkdG9TdHJpbmcuY2FsbChzZWFyY2gpID09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZ0xlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHNlYXJjaFN0cmluZyA9IFN0cmluZyhzZWFyY2gpO1xuICAgIHZhciBzZWFyY2hMZW5ndGggPSBzZWFyY2hTdHJpbmcubGVuZ3RoO1xuICAgIHZhciBwb3MgPSBzdHJpbmdMZW5ndGg7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICB2YXIgcG9zaXRpb24gPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAocG9zaXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwb3MgPSBwb3NpdGlvbiA/IE51bWJlcihwb3NpdGlvbikgOiAwO1xuICAgICAgICBpZiAoaXNOYU4ocG9zKSkge1xuICAgICAgICAgIHBvcyA9IDA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGVuZCA9IE1hdGgubWluKE1hdGgubWF4KHBvcywgMCksIHN0cmluZ0xlbmd0aCk7XG4gICAgdmFyIHN0YXJ0ID0gZW5kIC0gc2VhcmNoTGVuZ3RoO1xuICAgIGlmIChzdGFydCA8IDApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuICRsYXN0SW5kZXhPZi5jYWxsKHN0cmluZywgc2VhcmNoU3RyaW5nLCBzdGFydCkgPT0gc3RhcnQ7XG4gIH1cbiAgZnVuY3Rpb24gY29udGFpbnMoc2VhcmNoKSB7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgdmFyIHN0cmluZ0xlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHNlYXJjaFN0cmluZyA9IFN0cmluZyhzZWFyY2gpO1xuICAgIHZhciBzZWFyY2hMZW5ndGggPSBzZWFyY2hTdHJpbmcubGVuZ3RoO1xuICAgIHZhciBwb3NpdGlvbiA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogdW5kZWZpbmVkO1xuICAgIHZhciBwb3MgPSBwb3NpdGlvbiA/IE51bWJlcihwb3NpdGlvbikgOiAwO1xuICAgIGlmIChpc05hTihwb3MpKSB7XG4gICAgICBwb3MgPSAwO1xuICAgIH1cbiAgICB2YXIgc3RhcnQgPSBNYXRoLm1pbihNYXRoLm1heChwb3MsIDApLCBzdHJpbmdMZW5ndGgpO1xuICAgIHJldHVybiAkaW5kZXhPZi5jYWxsKHN0cmluZywgc2VhcmNoU3RyaW5nLCBwb3MpICE9IC0xO1xuICB9XG4gIGZ1bmN0aW9uIHJlcGVhdChjb3VudCkge1xuICAgIGlmICh0aGlzID09IG51bGwpIHtcbiAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgIH1cbiAgICB2YXIgc3RyaW5nID0gU3RyaW5nKHRoaXMpO1xuICAgIHZhciBuID0gY291bnQgPyBOdW1iZXIoY291bnQpIDogMDtcbiAgICBpZiAoaXNOYU4obikpIHtcbiAgICAgIG4gPSAwO1xuICAgIH1cbiAgICBpZiAobiA8IDAgfHwgbiA9PSBJbmZpbml0eSkge1xuICAgICAgdGhyb3cgUmFuZ2VFcnJvcigpO1xuICAgIH1cbiAgICBpZiAobiA9PSAwKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSAnJztcbiAgICB3aGlsZSAobi0tKSB7XG4gICAgICByZXN1bHQgKz0gc3RyaW5nO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIGZ1bmN0aW9uIGNvZGVQb2ludEF0KHBvc2l0aW9uKSB7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgdmFyIHNpemUgPSBzdHJpbmcubGVuZ3RoO1xuICAgIHZhciBpbmRleCA9IHBvc2l0aW9uID8gTnVtYmVyKHBvc2l0aW9uKSA6IDA7XG4gICAgaWYgKGlzTmFOKGluZGV4KSkge1xuICAgICAgaW5kZXggPSAwO1xuICAgIH1cbiAgICBpZiAoaW5kZXggPCAwIHx8IGluZGV4ID49IHNpemUpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBmaXJzdCA9IHN0cmluZy5jaGFyQ29kZUF0KGluZGV4KTtcbiAgICB2YXIgc2Vjb25kO1xuICAgIGlmIChmaXJzdCA+PSAweEQ4MDAgJiYgZmlyc3QgPD0gMHhEQkZGICYmIHNpemUgPiBpbmRleCArIDEpIHtcbiAgICAgIHNlY29uZCA9IHN0cmluZy5jaGFyQ29kZUF0KGluZGV4ICsgMSk7XG4gICAgICBpZiAoc2Vjb25kID49IDB4REMwMCAmJiBzZWNvbmQgPD0gMHhERkZGKSB7XG4gICAgICAgIHJldHVybiAoZmlyc3QgLSAweEQ4MDApICogMHg0MDAgKyBzZWNvbmQgLSAweERDMDAgKyAweDEwMDAwO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmlyc3Q7XG4gIH1cbiAgZnVuY3Rpb24gcmF3KGNhbGxzaXRlKSB7XG4gICAgdmFyIHJhdyA9IGNhbGxzaXRlLnJhdztcbiAgICB2YXIgbGVuID0gcmF3Lmxlbmd0aCA+Pj4gMDtcbiAgICBpZiAobGVuID09PSAwKVxuICAgICAgcmV0dXJuICcnO1xuICAgIHZhciBzID0gJyc7XG4gICAgdmFyIGkgPSAwO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBzICs9IHJhd1tpXTtcbiAgICAgIGlmIChpICsgMSA9PT0gbGVuKVxuICAgICAgICByZXR1cm4gcztcbiAgICAgIHMgKz0gYXJndW1lbnRzWysraV07XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIGZyb21Db2RlUG9pbnQoKSB7XG4gICAgdmFyIGNvZGVVbml0cyA9IFtdO1xuICAgIHZhciBmbG9vciA9IE1hdGguZmxvb3I7XG4gICAgdmFyIGhpZ2hTdXJyb2dhdGU7XG4gICAgdmFyIGxvd1N1cnJvZ2F0ZTtcbiAgICB2YXIgaW5kZXggPSAtMTtcbiAgICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBpZiAoIWxlbmd0aCkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgdmFyIGNvZGVQb2ludCA9IE51bWJlcihhcmd1bWVudHNbaW5kZXhdKTtcbiAgICAgIGlmICghaXNGaW5pdGUoY29kZVBvaW50KSB8fCBjb2RlUG9pbnQgPCAwIHx8IGNvZGVQb2ludCA+IDB4MTBGRkZGIHx8IGZsb29yKGNvZGVQb2ludCkgIT0gY29kZVBvaW50KSB7XG4gICAgICAgIHRocm93IFJhbmdlRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludDogJyArIGNvZGVQb2ludCk7XG4gICAgICB9XG4gICAgICBpZiAoY29kZVBvaW50IDw9IDB4RkZGRikge1xuICAgICAgICBjb2RlVW5pdHMucHVzaChjb2RlUG9pbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29kZVBvaW50IC09IDB4MTAwMDA7XG4gICAgICAgIGhpZ2hTdXJyb2dhdGUgPSAoY29kZVBvaW50ID4+IDEwKSArIDB4RDgwMDtcbiAgICAgICAgbG93U3Vycm9nYXRlID0gKGNvZGVQb2ludCAlIDB4NDAwKSArIDB4REMwMDtcbiAgICAgICAgY29kZVVuaXRzLnB1c2goaGlnaFN1cnJvZ2F0ZSwgbG93U3Vycm9nYXRlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgY29kZVVuaXRzKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGdldCBzdGFydHNXaXRoKCkge1xuICAgICAgcmV0dXJuIHN0YXJ0c1dpdGg7XG4gICAgfSxcbiAgICBnZXQgZW5kc1dpdGgoKSB7XG4gICAgICByZXR1cm4gZW5kc1dpdGg7XG4gICAgfSxcbiAgICBnZXQgY29udGFpbnMoKSB7XG4gICAgICByZXR1cm4gY29udGFpbnM7XG4gICAgfSxcbiAgICBnZXQgcmVwZWF0KCkge1xuICAgICAgcmV0dXJuIHJlcGVhdDtcbiAgICB9LFxuICAgIGdldCBjb2RlUG9pbnRBdCgpIHtcbiAgICAgIHJldHVybiBjb2RlUG9pbnRBdDtcbiAgICB9LFxuICAgIGdldCByYXcoKSB7XG4gICAgICByZXR1cm4gcmF3O1xuICAgIH0sXG4gICAgZ2V0IGZyb21Db2RlUG9pbnQoKSB7XG4gICAgICByZXR1cm4gZnJvbUNvZGVQb2ludDtcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5yZWdpc3RlcihcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3BvbHlmaWxsc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy9wb2x5ZmlsbHNcIjtcbiAgdmFyIFByb21pc2UgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC4zMi9zcmMvcnVudGltZS9wb2x5ZmlsbHMvUHJvbWlzZVwiKS5Qcm9taXNlO1xuICB2YXIgJF9fOSA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy9TdHJpbmdcIiksXG4gICAgICBjb2RlUG9pbnRBdCA9ICRfXzkuY29kZVBvaW50QXQsXG4gICAgICBjb250YWlucyA9ICRfXzkuY29udGFpbnMsXG4gICAgICBlbmRzV2l0aCA9ICRfXzkuZW5kc1dpdGgsXG4gICAgICBmcm9tQ29kZVBvaW50ID0gJF9fOS5mcm9tQ29kZVBvaW50LFxuICAgICAgcmVwZWF0ID0gJF9fOS5yZXBlYXQsXG4gICAgICByYXcgPSAkX185LnJhdyxcbiAgICAgIHN0YXJ0c1dpdGggPSAkX185LnN0YXJ0c1dpdGg7XG4gIHZhciAkX185ID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGxzL0FycmF5SXRlcmF0b3JcIiksXG4gICAgICBlbnRyaWVzID0gJF9fOS5lbnRyaWVzLFxuICAgICAga2V5cyA9ICRfXzkua2V5cyxcbiAgICAgIHZhbHVlcyA9ICRfXzkudmFsdWVzO1xuICBmdW5jdGlvbiBtYXliZURlZmluZU1ldGhvZChvYmplY3QsIG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKCEobmFtZSBpbiBvYmplY3QpKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBtYXliZUFkZEZ1bmN0aW9ucyhvYmplY3QsIGZ1bmN0aW9ucykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZnVuY3Rpb25zLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICB2YXIgbmFtZSA9IGZ1bmN0aW9uc1tpXTtcbiAgICAgIHZhciB2YWx1ZSA9IGZ1bmN0aW9uc1tpICsgMV07XG4gICAgICBtYXliZURlZmluZU1ldGhvZChvYmplY3QsIG5hbWUsIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxQcm9taXNlKGdsb2JhbCkge1xuICAgIGlmICghZ2xvYmFsLlByb21pc2UpXG4gICAgICBnbG9iYWwuUHJvbWlzZSA9IFByb21pc2U7XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxTdHJpbmcoU3RyaW5nKSB7XG4gICAgbWF5YmVBZGRGdW5jdGlvbnMoU3RyaW5nLnByb3RvdHlwZSwgWydjb2RlUG9pbnRBdCcsIGNvZGVQb2ludEF0LCAnY29udGFpbnMnLCBjb250YWlucywgJ2VuZHNXaXRoJywgZW5kc1dpdGgsICdzdGFydHNXaXRoJywgc3RhcnRzV2l0aCwgJ3JlcGVhdCcsIHJlcGVhdF0pO1xuICAgIG1heWJlQWRkRnVuY3Rpb25zKFN0cmluZywgWydmcm9tQ29kZVBvaW50JywgZnJvbUNvZGVQb2ludCwgJ3JhdycsIHJhd10pO1xuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsQXJyYXkoQXJyYXksIFN5bWJvbCkge1xuICAgIG1heWJlQWRkRnVuY3Rpb25zKEFycmF5LnByb3RvdHlwZSwgWydlbnRyaWVzJywgZW50cmllcywgJ2tleXMnLCBrZXlzLCAndmFsdWVzJywgdmFsdWVzXSk7XG4gICAgaWYgKFN5bWJvbCAmJiBTeW1ib2wuaXRlcmF0b3IpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShBcnJheS5wcm90b3R5cGUsIFN5bWJvbC5pdGVyYXRvciwge1xuICAgICAgICB2YWx1ZTogdmFsdWVzLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsKGdsb2JhbCkge1xuICAgIHBvbHlmaWxsUHJvbWlzZShnbG9iYWwpO1xuICAgIHBvbHlmaWxsU3RyaW5nKGdsb2JhbC5TdHJpbmcpO1xuICAgIHBvbHlmaWxsQXJyYXkoZ2xvYmFsLkFycmF5LCBnbG9iYWwuU3ltYm9sKTtcbiAgfVxuICBwb2x5ZmlsbCh0aGlzKTtcbiAgdmFyIHNldHVwR2xvYmFscyA9ICR0cmFjZXVyUnVudGltZS5zZXR1cEdsb2JhbHM7XG4gICR0cmFjZXVyUnVudGltZS5zZXR1cEdsb2JhbHMgPSBmdW5jdGlvbihnbG9iYWwpIHtcbiAgICBzZXR1cEdsb2JhbHMoZ2xvYmFsKTtcbiAgICBwb2x5ZmlsbChnbG9iYWwpO1xuICB9O1xuICByZXR1cm4ge307XG59KTtcblN5c3RlbS5yZWdpc3RlcihcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGwtaW1wb3J0XCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGwtaW1wb3J0XCI7XG4gIHZhciAkX18xMSA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjMyL3NyYy9ydW50aW1lL3BvbHlmaWxscy9wb2x5ZmlsbHNcIik7XG4gIHJldHVybiB7fTtcbn0pO1xuU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuMzIvc3JjL3J1bnRpbWUvcG9seWZpbGwtaW1wb3J0XCIgKyAnJyk7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiRldhQVNIXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjL1BhdGhGaW5kaW5nJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL2hlYXAnKTtcbiIsIi8vIEdlbmVyYXRlZCBieSBDb2ZmZWVTY3JpcHQgMS42LjNcbihmdW5jdGlvbigpIHtcbiAgdmFyIEhlYXAsIGRlZmF1bHRDbXAsIGZsb29yLCBoZWFwaWZ5LCBoZWFwcG9wLCBoZWFwcHVzaCwgaGVhcHB1c2hwb3AsIGhlYXByZXBsYWNlLCBpbnNvcnQsIG1pbiwgbmxhcmdlc3QsIG5zbWFsbGVzdCwgdXBkYXRlSXRlbSwgX3NpZnRkb3duLCBfc2lmdHVwO1xuXG4gIGZsb29yID0gTWF0aC5mbG9vciwgbWluID0gTWF0aC5taW47XG5cbiAgLyogXG4gIERlZmF1bHQgY29tcGFyaXNvbiBmdW5jdGlvbiB0byBiZSB1c2VkXG4gICovXG5cblxuICBkZWZhdWx0Q21wID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIGlmICh4IDwgeSkge1xuICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbiAgICBpZiAoeCA+IHkpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfTtcblxuICAvKiBcbiAgSW5zZXJ0IGl0ZW0geCBpbiBsaXN0IGEsIGFuZCBrZWVwIGl0IHNvcnRlZCBhc3N1bWluZyBhIGlzIHNvcnRlZC5cbiAgXG4gIElmIHggaXMgYWxyZWFkeSBpbiBhLCBpbnNlcnQgaXQgdG8gdGhlIHJpZ2h0IG9mIHRoZSByaWdodG1vc3QgeC5cbiAgXG4gIE9wdGlvbmFsIGFyZ3MgbG8gKGRlZmF1bHQgMCkgYW5kIGhpIChkZWZhdWx0IGEubGVuZ3RoKSBib3VuZCB0aGUgc2xpY2VcbiAgb2YgYSB0byBiZSBzZWFyY2hlZC5cbiAgKi9cblxuXG4gIGluc29ydCA9IGZ1bmN0aW9uKGEsIHgsIGxvLCBoaSwgY21wKSB7XG4gICAgdmFyIG1pZDtcbiAgICBpZiAobG8gPT0gbnVsbCkge1xuICAgICAgbG8gPSAwO1xuICAgIH1cbiAgICBpZiAoY21wID09IG51bGwpIHtcbiAgICAgIGNtcCA9IGRlZmF1bHRDbXA7XG4gICAgfVxuICAgIGlmIChsbyA8IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbG8gbXVzdCBiZSBub24tbmVnYXRpdmUnKTtcbiAgICB9XG4gICAgaWYgKGhpID09IG51bGwpIHtcbiAgICAgIGhpID0gYS5sZW5ndGg7XG4gICAgfVxuICAgIHdoaWxlIChsbyA8IGhpKSB7XG4gICAgICBtaWQgPSBmbG9vcigobG8gKyBoaSkgLyAyKTtcbiAgICAgIGlmIChjbXAoeCwgYVttaWRdKSA8IDApIHtcbiAgICAgICAgaGkgPSBtaWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsbyA9IG1pZCArIDE7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAoW10uc3BsaWNlLmFwcGx5KGEsIFtsbywgbG8gLSBsb10uY29uY2F0KHgpKSwgeCk7XG4gIH07XG5cbiAgLypcbiAgUHVzaCBpdGVtIG9udG8gaGVhcCwgbWFpbnRhaW5pbmcgdGhlIGhlYXAgaW52YXJpYW50LlxuICAqL1xuXG5cbiAgaGVhcHB1c2ggPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgY21wKSB7XG4gICAgaWYgKGNtcCA9PSBudWxsKSB7XG4gICAgICBjbXAgPSBkZWZhdWx0Q21wO1xuICAgIH1cbiAgICBhcnJheS5wdXNoKGl0ZW0pO1xuICAgIHJldHVybiBfc2lmdGRvd24oYXJyYXksIDAsIGFycmF5Lmxlbmd0aCAtIDEsIGNtcCk7XG4gIH07XG5cbiAgLypcbiAgUG9wIHRoZSBzbWFsbGVzdCBpdGVtIG9mZiB0aGUgaGVhcCwgbWFpbnRhaW5pbmcgdGhlIGhlYXAgaW52YXJpYW50LlxuICAqL1xuXG5cbiAgaGVhcHBvcCA9IGZ1bmN0aW9uKGFycmF5LCBjbXApIHtcbiAgICB2YXIgbGFzdGVsdCwgcmV0dXJuaXRlbTtcbiAgICBpZiAoY21wID09IG51bGwpIHtcbiAgICAgIGNtcCA9IGRlZmF1bHRDbXA7XG4gICAgfVxuICAgIGxhc3RlbHQgPSBhcnJheS5wb3AoKTtcbiAgICBpZiAoYXJyYXkubGVuZ3RoKSB7XG4gICAgICByZXR1cm5pdGVtID0gYXJyYXlbMF07XG4gICAgICBhcnJheVswXSA9IGxhc3RlbHQ7XG4gICAgICBfc2lmdHVwKGFycmF5LCAwLCBjbXApO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm5pdGVtID0gbGFzdGVsdDtcbiAgICB9XG4gICAgcmV0dXJuIHJldHVybml0ZW07XG4gIH07XG5cbiAgLypcbiAgUG9wIGFuZCByZXR1cm4gdGhlIGN1cnJlbnQgc21hbGxlc3QgdmFsdWUsIGFuZCBhZGQgdGhlIG5ldyBpdGVtLlxuICBcbiAgVGhpcyBpcyBtb3JlIGVmZmljaWVudCB0aGFuIGhlYXBwb3AoKSBmb2xsb3dlZCBieSBoZWFwcHVzaCgpLCBhbmQgY2FuIGJlIFxuICBtb3JlIGFwcHJvcHJpYXRlIHdoZW4gdXNpbmcgYSBmaXhlZCBzaXplIGhlYXAuIE5vdGUgdGhhdCB0aGUgdmFsdWVcbiAgcmV0dXJuZWQgbWF5IGJlIGxhcmdlciB0aGFuIGl0ZW0hIFRoYXQgY29uc3RyYWlucyByZWFzb25hYmxlIHVzZSBvZlxuICB0aGlzIHJvdXRpbmUgdW5sZXNzIHdyaXR0ZW4gYXMgcGFydCBvZiBhIGNvbmRpdGlvbmFsIHJlcGxhY2VtZW50OlxuICAgICAgaWYgaXRlbSA+IGFycmF5WzBdXG4gICAgICAgIGl0ZW0gPSBoZWFwcmVwbGFjZShhcnJheSwgaXRlbSlcbiAgKi9cblxuXG4gIGhlYXByZXBsYWNlID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGNtcCkge1xuICAgIHZhciByZXR1cm5pdGVtO1xuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgcmV0dXJuaXRlbSA9IGFycmF5WzBdO1xuICAgIGFycmF5WzBdID0gaXRlbTtcbiAgICBfc2lmdHVwKGFycmF5LCAwLCBjbXApO1xuICAgIHJldHVybiByZXR1cm5pdGVtO1xuICB9O1xuXG4gIC8qXG4gIEZhc3QgdmVyc2lvbiBvZiBhIGhlYXBwdXNoIGZvbGxvd2VkIGJ5IGEgaGVhcHBvcC5cbiAgKi9cblxuXG4gIGhlYXBwdXNocG9wID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGNtcCkge1xuICAgIHZhciBfcmVmO1xuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgaWYgKGFycmF5Lmxlbmd0aCAmJiBjbXAoYXJyYXlbMF0sIGl0ZW0pIDwgMCkge1xuICAgICAgX3JlZiA9IFthcnJheVswXSwgaXRlbV0sIGl0ZW0gPSBfcmVmWzBdLCBhcnJheVswXSA9IF9yZWZbMV07XG4gICAgICBfc2lmdHVwKGFycmF5LCAwLCBjbXApO1xuICAgIH1cbiAgICByZXR1cm4gaXRlbTtcbiAgfTtcblxuICAvKlxuICBUcmFuc2Zvcm0gbGlzdCBpbnRvIGEgaGVhcCwgaW4tcGxhY2UsIGluIE8oYXJyYXkubGVuZ3RoKSB0aW1lLlxuICAqL1xuXG5cbiAgaGVhcGlmeSA9IGZ1bmN0aW9uKGFycmF5LCBjbXApIHtcbiAgICB2YXIgaSwgX2ksIF9qLCBfbGVuLCBfcmVmLCBfcmVmMSwgX3Jlc3VsdHMsIF9yZXN1bHRzMTtcbiAgICBpZiAoY21wID09IG51bGwpIHtcbiAgICAgIGNtcCA9IGRlZmF1bHRDbXA7XG4gICAgfVxuICAgIF9yZWYxID0gKGZ1bmN0aW9uKCkge1xuICAgICAgX3Jlc3VsdHMxID0gW107XG4gICAgICBmb3IgKHZhciBfaiA9IDAsIF9yZWYgPSBmbG9vcihhcnJheS5sZW5ndGggLyAyKTsgMCA8PSBfcmVmID8gX2ogPCBfcmVmIDogX2ogPiBfcmVmOyAwIDw9IF9yZWYgPyBfaisrIDogX2otLSl7IF9yZXN1bHRzMS5wdXNoKF9qKTsgfVxuICAgICAgcmV0dXJuIF9yZXN1bHRzMTtcbiAgICB9KS5hcHBseSh0aGlzKS5yZXZlcnNlKCk7XG4gICAgX3Jlc3VsdHMgPSBbXTtcbiAgICBmb3IgKF9pID0gMCwgX2xlbiA9IF9yZWYxLmxlbmd0aDsgX2kgPCBfbGVuOyBfaSsrKSB7XG4gICAgICBpID0gX3JlZjFbX2ldO1xuICAgICAgX3Jlc3VsdHMucHVzaChfc2lmdHVwKGFycmF5LCBpLCBjbXApKTtcbiAgICB9XG4gICAgcmV0dXJuIF9yZXN1bHRzO1xuICB9O1xuXG4gIC8qXG4gIFVwZGF0ZSB0aGUgcG9zaXRpb24gb2YgdGhlIGdpdmVuIGl0ZW0gaW4gdGhlIGhlYXAuXG4gIFRoaXMgZnVuY3Rpb24gc2hvdWxkIGJlIGNhbGxlZCBldmVyeSB0aW1lIHRoZSBpdGVtIGlzIGJlaW5nIG1vZGlmaWVkLlxuICAqL1xuXG5cbiAgdXBkYXRlSXRlbSA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBjbXApIHtcbiAgICB2YXIgcG9zO1xuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgcG9zID0gYXJyYXkuaW5kZXhPZihpdGVtKTtcbiAgICBpZiAocG9zID09PSAtMSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBfc2lmdGRvd24oYXJyYXksIDAsIHBvcywgY21wKTtcbiAgICByZXR1cm4gX3NpZnR1cChhcnJheSwgcG9zLCBjbXApO1xuICB9O1xuXG4gIC8qXG4gIEZpbmQgdGhlIG4gbGFyZ2VzdCBlbGVtZW50cyBpbiBhIGRhdGFzZXQuXG4gICovXG5cblxuICBubGFyZ2VzdCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBjbXApIHtcbiAgICB2YXIgZWxlbSwgcmVzdWx0LCBfaSwgX2xlbiwgX3JlZjtcbiAgICBpZiAoY21wID09IG51bGwpIHtcbiAgICAgIGNtcCA9IGRlZmF1bHRDbXA7XG4gICAgfVxuICAgIHJlc3VsdCA9IGFycmF5LnNsaWNlKDAsIG4pO1xuICAgIGlmICghcmVzdWx0Lmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgaGVhcGlmeShyZXN1bHQsIGNtcCk7XG4gICAgX3JlZiA9IGFycmF5LnNsaWNlKG4pO1xuICAgIGZvciAoX2kgPSAwLCBfbGVuID0gX3JlZi5sZW5ndGg7IF9pIDwgX2xlbjsgX2krKykge1xuICAgICAgZWxlbSA9IF9yZWZbX2ldO1xuICAgICAgaGVhcHB1c2hwb3AocmVzdWx0LCBlbGVtLCBjbXApO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0LnNvcnQoY21wKS5yZXZlcnNlKCk7XG4gIH07XG5cbiAgLypcbiAgRmluZCB0aGUgbiBzbWFsbGVzdCBlbGVtZW50cyBpbiBhIGRhdGFzZXQuXG4gICovXG5cblxuICBuc21hbGxlc3QgPSBmdW5jdGlvbihhcnJheSwgbiwgY21wKSB7XG4gICAgdmFyIGVsZW0sIGksIGxvcywgcmVzdWx0LCBfaSwgX2osIF9sZW4sIF9yZWYsIF9yZWYxLCBfcmVzdWx0cztcbiAgICBpZiAoY21wID09IG51bGwpIHtcbiAgICAgIGNtcCA9IGRlZmF1bHRDbXA7XG4gICAgfVxuICAgIGlmIChuICogMTAgPD0gYXJyYXkubGVuZ3RoKSB7XG4gICAgICByZXN1bHQgPSBhcnJheS5zbGljZSgwLCBuKS5zb3J0KGNtcCk7XG4gICAgICBpZiAoIXJlc3VsdC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICAgIGxvcyA9IHJlc3VsdFtyZXN1bHQubGVuZ3RoIC0gMV07XG4gICAgICBfcmVmID0gYXJyYXkuc2xpY2Uobik7XG4gICAgICBmb3IgKF9pID0gMCwgX2xlbiA9IF9yZWYubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcbiAgICAgICAgZWxlbSA9IF9yZWZbX2ldO1xuICAgICAgICBpZiAoY21wKGVsZW0sIGxvcykgPCAwKSB7XG4gICAgICAgICAgaW5zb3J0KHJlc3VsdCwgZWxlbSwgMCwgbnVsbCwgY21wKTtcbiAgICAgICAgICByZXN1bHQucG9wKCk7XG4gICAgICAgICAgbG9zID0gcmVzdWx0W3Jlc3VsdC5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgaGVhcGlmeShhcnJheSwgY21wKTtcbiAgICBfcmVzdWx0cyA9IFtdO1xuICAgIGZvciAoaSA9IF9qID0gMCwgX3JlZjEgPSBtaW4obiwgYXJyYXkubGVuZ3RoKTsgMCA8PSBfcmVmMSA/IF9qIDwgX3JlZjEgOiBfaiA+IF9yZWYxOyBpID0gMCA8PSBfcmVmMSA/ICsrX2ogOiAtLV9qKSB7XG4gICAgICBfcmVzdWx0cy5wdXNoKGhlYXBwb3AoYXJyYXksIGNtcCkpO1xuICAgIH1cbiAgICByZXR1cm4gX3Jlc3VsdHM7XG4gIH07XG5cbiAgX3NpZnRkb3duID0gZnVuY3Rpb24oYXJyYXksIHN0YXJ0cG9zLCBwb3MsIGNtcCkge1xuICAgIHZhciBuZXdpdGVtLCBwYXJlbnQsIHBhcmVudHBvcztcbiAgICBpZiAoY21wID09IG51bGwpIHtcbiAgICAgIGNtcCA9IGRlZmF1bHRDbXA7XG4gICAgfVxuICAgIG5ld2l0ZW0gPSBhcnJheVtwb3NdO1xuICAgIHdoaWxlIChwb3MgPiBzdGFydHBvcykge1xuICAgICAgcGFyZW50cG9zID0gKHBvcyAtIDEpID4+IDE7XG4gICAgICBwYXJlbnQgPSBhcnJheVtwYXJlbnRwb3NdO1xuICAgICAgaWYgKGNtcChuZXdpdGVtLCBwYXJlbnQpIDwgMCkge1xuICAgICAgICBhcnJheVtwb3NdID0gcGFyZW50O1xuICAgICAgICBwb3MgPSBwYXJlbnRwb3M7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiBhcnJheVtwb3NdID0gbmV3aXRlbTtcbiAgfTtcblxuICBfc2lmdHVwID0gZnVuY3Rpb24oYXJyYXksIHBvcywgY21wKSB7XG4gICAgdmFyIGNoaWxkcG9zLCBlbmRwb3MsIG5ld2l0ZW0sIHJpZ2h0cG9zLCBzdGFydHBvcztcbiAgICBpZiAoY21wID09IG51bGwpIHtcbiAgICAgIGNtcCA9IGRlZmF1bHRDbXA7XG4gICAgfVxuICAgIGVuZHBvcyA9IGFycmF5Lmxlbmd0aDtcbiAgICBzdGFydHBvcyA9IHBvcztcbiAgICBuZXdpdGVtID0gYXJyYXlbcG9zXTtcbiAgICBjaGlsZHBvcyA9IDIgKiBwb3MgKyAxO1xuICAgIHdoaWxlIChjaGlsZHBvcyA8IGVuZHBvcykge1xuICAgICAgcmlnaHRwb3MgPSBjaGlsZHBvcyArIDE7XG4gICAgICBpZiAocmlnaHRwb3MgPCBlbmRwb3MgJiYgIShjbXAoYXJyYXlbY2hpbGRwb3NdLCBhcnJheVtyaWdodHBvc10pIDwgMCkpIHtcbiAgICAgICAgY2hpbGRwb3MgPSByaWdodHBvcztcbiAgICAgIH1cbiAgICAgIGFycmF5W3Bvc10gPSBhcnJheVtjaGlsZHBvc107XG4gICAgICBwb3MgPSBjaGlsZHBvcztcbiAgICAgIGNoaWxkcG9zID0gMiAqIHBvcyArIDE7XG4gICAgfVxuICAgIGFycmF5W3Bvc10gPSBuZXdpdGVtO1xuICAgIHJldHVybiBfc2lmdGRvd24oYXJyYXksIHN0YXJ0cG9zLCBwb3MsIGNtcCk7XG4gIH07XG5cbiAgSGVhcCA9IChmdW5jdGlvbigpIHtcbiAgICBIZWFwLnB1c2ggPSBoZWFwcHVzaDtcblxuICAgIEhlYXAucG9wID0gaGVhcHBvcDtcblxuICAgIEhlYXAucmVwbGFjZSA9IGhlYXByZXBsYWNlO1xuXG4gICAgSGVhcC5wdXNocG9wID0gaGVhcHB1c2hwb3A7XG5cbiAgICBIZWFwLmhlYXBpZnkgPSBoZWFwaWZ5O1xuXG4gICAgSGVhcC5ubGFyZ2VzdCA9IG5sYXJnZXN0O1xuXG4gICAgSGVhcC5uc21hbGxlc3QgPSBuc21hbGxlc3Q7XG5cbiAgICBmdW5jdGlvbiBIZWFwKGNtcCkge1xuICAgICAgdGhpcy5jbXAgPSBjbXAgIT0gbnVsbCA/IGNtcCA6IGRlZmF1bHRDbXA7XG4gICAgICB0aGlzLm5vZGVzID0gW107XG4gICAgfVxuXG4gICAgSGVhcC5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiBoZWFwcHVzaCh0aGlzLm5vZGVzLCB4LCB0aGlzLmNtcCk7XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLnBvcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGhlYXBwb3AodGhpcy5ub2RlcywgdGhpcy5jbXApO1xuICAgIH07XG5cbiAgICBIZWFwLnByb3RvdHlwZS5wZWVrID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5ub2Rlc1swXTtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUuY29udGFpbnMgPSBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gdGhpcy5ub2Rlcy5pbmRleE9mKHgpICE9PSAtMTtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUucmVwbGFjZSA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiBoZWFwcmVwbGFjZSh0aGlzLm5vZGVzLCB4LCB0aGlzLmNtcCk7XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLnB1c2hwb3AgPSBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gaGVhcHB1c2hwb3AodGhpcy5ub2RlcywgeCwgdGhpcy5jbXApO1xuICAgIH07XG5cbiAgICBIZWFwLnByb3RvdHlwZS5oZWFwaWZ5ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gaGVhcGlmeSh0aGlzLm5vZGVzLCB0aGlzLmNtcCk7XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLnVwZGF0ZUl0ZW0gPSBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gdXBkYXRlSXRlbSh0aGlzLm5vZGVzLCB4LCB0aGlzLmNtcCk7XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5ub2RlcyA9IFtdO1xuICAgIH07XG5cbiAgICBIZWFwLnByb3RvdHlwZS5lbXB0eSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMubm9kZXMubGVuZ3RoID09PSAwO1xuICAgIH07XG5cbiAgICBIZWFwLnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5ub2Rlcy5sZW5ndGg7XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaGVhcDtcbiAgICAgIGhlYXAgPSBuZXcgSGVhcCgpO1xuICAgICAgaGVhcC5ub2RlcyA9IHRoaXMubm9kZXMuc2xpY2UoMCk7XG4gICAgICByZXR1cm4gaGVhcDtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUudG9BcnJheSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMubm9kZXMuc2xpY2UoMCk7XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLmluc2VydCA9IEhlYXAucHJvdG90eXBlLnB1c2g7XG5cbiAgICBIZWFwLnByb3RvdHlwZS5yZW1vdmUgPSBIZWFwLnByb3RvdHlwZS5wb3A7XG5cbiAgICBIZWFwLnByb3RvdHlwZS50b3AgPSBIZWFwLnByb3RvdHlwZS5wZWVrO1xuXG4gICAgSGVhcC5wcm90b3R5cGUuZnJvbnQgPSBIZWFwLnByb3RvdHlwZS5wZWVrO1xuXG4gICAgSGVhcC5wcm90b3R5cGUuaGFzID0gSGVhcC5wcm90b3R5cGUuY29udGFpbnM7XG5cbiAgICBIZWFwLnByb3RvdHlwZS5jb3B5ID0gSGVhcC5wcm90b3R5cGUuY2xvbmU7XG5cbiAgICByZXR1cm4gSGVhcDtcblxuICB9KSgpO1xuXG4gIGlmICh0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZSAhPT0gbnVsbCA/IG1vZHVsZS5leHBvcnRzIDogdm9pZCAwKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBIZWFwO1xuICB9IGVsc2Uge1xuICAgIHdpbmRvdy5IZWFwID0gSGVhcDtcbiAgfVxuXG59KS5jYWxsKHRoaXMpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgJ0hlYXAnICAgICAgICAgICAgICAgICA6IHJlcXVpcmUoJ2hlYXAnKSxcbiAgICAnTm9kZScgICAgICAgICAgICAgICAgIDogcmVxdWlyZSgnLi9jb3JlL05vZGUnKSxcbiAgICAnR3JpZCcgICAgICAgICAgICAgICAgIDogcmVxdWlyZSgnLi9jb3JlL0dyaWQnKSxcbiAgICAnVXRpbCcgICAgICAgICAgICAgICAgIDogcmVxdWlyZSgnLi9jb3JlL1V0aWwnKSxcbiAgICAnSGV1cmlzdGljJyAgICAgICAgICAgIDogcmVxdWlyZSgnLi9jb3JlL0hldXJpc3RpYycpLFxuICAgICdBU3RhckZpbmRlcicgICAgICAgICAgOiByZXF1aXJlKCcuL2ZpbmRlcnMvQVN0YXJGaW5kZXInKSxcbiAgICAnQmVzdEZpcnN0RmluZGVyJyAgICAgIDogcmVxdWlyZSgnLi9maW5kZXJzL0Jlc3RGaXJzdEZpbmRlcicpLFxuICAgICdCcmVhZHRoRmlyc3RGaW5kZXInICAgOiByZXF1aXJlKCcuL2ZpbmRlcnMvQnJlYWR0aEZpcnN0RmluZGVyJyksXG4gICAgJ0RpamtzdHJhRmluZGVyJyAgICAgICA6IHJlcXVpcmUoJy4vZmluZGVycy9EaWprc3RyYUZpbmRlcicpLFxuICAgICdCaUFTdGFyRmluZGVyJyAgICAgICAgOiByZXF1aXJlKCcuL2ZpbmRlcnMvQmlBU3RhckZpbmRlcicpLFxuICAgICdCaUJlc3RGaXJzdEZpbmRlcicgICAgOiByZXF1aXJlKCcuL2ZpbmRlcnMvQmlCZXN0Rmlyc3RGaW5kZXInKSxcbiAgICAnQmlCcmVhZHRoRmlyc3RGaW5kZXInIDogcmVxdWlyZSgnLi9maW5kZXJzL0JpQnJlYWR0aEZpcnN0RmluZGVyJyksXG4gICAgJ0JpRGlqa3N0cmFGaW5kZXInICAgICA6IHJlcXVpcmUoJy4vZmluZGVycy9CaURpamtzdHJhRmluZGVyJyksXG4gICAgJ0p1bXBQb2ludEZpbmRlcicgICAgICA6IHJlcXVpcmUoJy4vZmluZGVycy9KdW1wUG9pbnRGaW5kZXInKSxcbiAgICAnSURBU3RhckZpbmRlcicgICAgICAgIDogcmVxdWlyZSgnLi9maW5kZXJzL0lEQVN0YXJGaW5kZXInKSxcbiAgICAnT3J0aG9nb25hbEp1bXBQb2ludEZpbmRlcicgOiByZXF1aXJlKCcuL2ZpbmRlcnMvT3J0aG9nb25hbEp1bXBQb2ludEZpbmRlcicpXG59O1xuIiwidmFyIE5vZGUgPSByZXF1aXJlKCcuL05vZGUnKTtcblxuLyoqXG4gKiBUaGUgR3JpZCBjbGFzcywgd2hpY2ggc2VydmVzIGFzIHRoZSBlbmNhcHN1bGF0aW9uIG9mIHRoZSBsYXlvdXQgb2YgdGhlIG5vZGVzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge251bWJlcn0gd2lkdGggTnVtYmVyIG9mIGNvbHVtbnMgb2YgdGhlIGdyaWQuXG4gKiBAcGFyYW0ge251bWJlcn0gaGVpZ2h0IE51bWJlciBvZiByb3dzIG9mIHRoZSBncmlkLlxuICogQHBhcmFtIHtBcnJheS48QXJyYXkuPChudW1iZXJ8Ym9vbGVhbik+Pn0gW21hdHJpeF0gLSBBIDAtMSBtYXRyaXhcbiAqICAgICByZXByZXNlbnRpbmcgdGhlIHdhbGthYmxlIHN0YXR1cyBvZiB0aGUgbm9kZXMoMCBvciBmYWxzZSBmb3Igd2Fsa2FibGUpLlxuICogICAgIElmIHRoZSBtYXRyaXggaXMgbm90IHN1cHBsaWVkLCBhbGwgdGhlIG5vZGVzIHdpbGwgYmUgd2Fsa2FibGUuICAqL1xuZnVuY3Rpb24gR3JpZCh3aWR0aCwgaGVpZ2h0LCBtYXRyaXgpIHtcbiAgICAvKipcbiAgICAgKiBUaGUgbnVtYmVyIG9mIGNvbHVtbnMgb2YgdGhlIGdyaWQuXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICovXG4gICAgdGhpcy53aWR0aCA9IHdpZHRoO1xuICAgIC8qKlxuICAgICAqIFRoZSBudW1iZXIgb2Ygcm93cyBvZiB0aGUgZ3JpZC5cbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcblxuICAgIC8qKlxuICAgICAqIEEgMkQgYXJyYXkgb2Ygbm9kZXMuXG4gICAgICovXG4gICAgdGhpcy5ub2RlcyA9IHRoaXMuX2J1aWxkTm9kZXMod2lkdGgsIGhlaWdodCwgbWF0cml4KTtcbn1cblxuLyoqXG4gKiBCdWlsZCBhbmQgcmV0dXJuIHRoZSBub2Rlcy5cbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge251bWJlcn0gd2lkdGhcbiAqIEBwYXJhbSB7bnVtYmVyfSBoZWlnaHRcbiAqIEBwYXJhbSB7QXJyYXkuPEFycmF5LjxudW1iZXJ8Ym9vbGVhbj4+fSBbbWF0cml4XSAtIEEgMC0xIG1hdHJpeCByZXByZXNlbnRpbmdcbiAqICAgICB0aGUgd2Fsa2FibGUgc3RhdHVzIG9mIHRoZSBub2Rlcy5cbiAqIEBzZWUgR3JpZFxuICovXG5HcmlkLnByb3RvdHlwZS5fYnVpbGROb2RlcyA9IGZ1bmN0aW9uKHdpZHRoLCBoZWlnaHQsIG1hdHJpeCkge1xuICAgIHZhciBpLCBqLFxuICAgICAgICBub2RlcyA9IG5ldyBBcnJheShoZWlnaHQpLFxuICAgICAgICByb3c7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgaGVpZ2h0OyArK2kpIHtcbiAgICAgICAgbm9kZXNbaV0gPSBuZXcgQXJyYXkod2lkdGgpO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgd2lkdGg7ICsraikge1xuICAgICAgICAgICAgbm9kZXNbaV1bal0gPSBuZXcgTm9kZShqLCBpKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgaWYgKG1hdHJpeCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBub2RlcztcbiAgICB9XG5cbiAgICBpZiAobWF0cml4Lmxlbmd0aCAhPT0gaGVpZ2h0IHx8IG1hdHJpeFswXS5sZW5ndGggIT09IHdpZHRoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTWF0cml4IHNpemUgZG9lcyBub3QgZml0Jyk7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IGhlaWdodDsgKytpKSB7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCB3aWR0aDsgKytqKSB7XG4gICAgICAgICAgICBpZiAobWF0cml4W2ldW2pdKSB7XG4gICAgICAgICAgICAgICAgLy8gMCwgZmFsc2UsIG51bGwgd2lsbCBiZSB3YWxrYWJsZVxuICAgICAgICAgICAgICAgIC8vIHdoaWxlIG90aGVycyB3aWxsIGJlIHVuLXdhbGthYmxlXG4gICAgICAgICAgICAgICAgbm9kZXNbaV1bal0ud2Fsa2FibGUgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBub2Rlcztcbn07XG5cblxuR3JpZC5wcm90b3R5cGUuZ2V0Tm9kZUF0ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHJldHVybiB0aGlzLm5vZGVzW3ldW3hdO1xufTtcblxuXG4vKipcbiAqIERldGVybWluZSB3aGV0aGVyIHRoZSBub2RlIGF0IHRoZSBnaXZlbiBwb3NpdGlvbiBpcyB3YWxrYWJsZS5cbiAqIChBbHNvIHJldHVybnMgZmFsc2UgaWYgdGhlIHBvc2l0aW9uIGlzIG91dHNpZGUgdGhlIGdyaWQuKVxuICogQHBhcmFtIHtudW1iZXJ9IHggLSBUaGUgeCBjb29yZGluYXRlIG9mIHRoZSBub2RlLlxuICogQHBhcmFtIHtudW1iZXJ9IHkgLSBUaGUgeSBjb29yZGluYXRlIG9mIHRoZSBub2RlLlxuICogQHJldHVybiB7Ym9vbGVhbn0gLSBUaGUgd2Fsa2FiaWxpdHkgb2YgdGhlIG5vZGUuXG4gKi9cbkdyaWQucHJvdG90eXBlLmlzV2Fsa2FibGVBdCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICByZXR1cm4gdGhpcy5pc0luc2lkZSh4LCB5KSAmJiB0aGlzLm5vZGVzW3ldW3hdLndhbGthYmxlO1xufTtcblxuXG4vKipcbiAqIERldGVybWluZSB3aGV0aGVyIHRoZSBwb3NpdGlvbiBpcyBpbnNpZGUgdGhlIGdyaWQuXG4gKiBYWFg6IGBncmlkLmlzSW5zaWRlKHgsIHkpYCBpcyB3aWVyZCB0byByZWFkLlxuICogSXQgc2hvdWxkIGJlIGAoeCwgeSkgaXMgaW5zaWRlIGdyaWRgLCBidXQgSSBmYWlsZWQgdG8gZmluZCBhIGJldHRlclxuICogbmFtZSBmb3IgdGhpcyBtZXRob2QuXG4gKiBAcGFyYW0ge251bWJlcn0geFxuICogQHBhcmFtIHtudW1iZXJ9IHlcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbkdyaWQucHJvdG90eXBlLmlzSW5zaWRlID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHJldHVybiAoeCA+PSAwICYmIHggPCB0aGlzLndpZHRoKSAmJiAoeSA+PSAwICYmIHkgPCB0aGlzLmhlaWdodCk7XG59O1xuXG5cbi8qKlxuICogU2V0IHdoZXRoZXIgdGhlIG5vZGUgb24gdGhlIGdpdmVuIHBvc2l0aW9uIGlzIHdhbGthYmxlLlxuICogTk9URTogdGhyb3dzIGV4Y2VwdGlvbiBpZiB0aGUgY29vcmRpbmF0ZSBpcyBub3QgaW5zaWRlIHRoZSBncmlkLlxuICogQHBhcmFtIHtudW1iZXJ9IHggLSBUaGUgeCBjb29yZGluYXRlIG9mIHRoZSBub2RlLlxuICogQHBhcmFtIHtudW1iZXJ9IHkgLSBUaGUgeSBjb29yZGluYXRlIG9mIHRoZSBub2RlLlxuICogQHBhcmFtIHtib29sZWFufSB3YWxrYWJsZSAtIFdoZXRoZXIgdGhlIHBvc2l0aW9uIGlzIHdhbGthYmxlLlxuICovXG5HcmlkLnByb3RvdHlwZS5zZXRXYWxrYWJsZUF0ID0gZnVuY3Rpb24oeCwgeSwgd2Fsa2FibGUpIHtcbiAgICB0aGlzLm5vZGVzW3ldW3hdLndhbGthYmxlID0gd2Fsa2FibGU7XG59O1xuXG5cbi8qKlxuICogR2V0IHRoZSBuZWlnaGJvcnMgb2YgdGhlIGdpdmVuIG5vZGUuXG4gKlxuICogICAgIG9mZnNldHMgICAgICBkaWFnb25hbE9mZnNldHM6XG4gKiAgKy0tLSstLS0rLS0tKyAgICArLS0tKy0tLSstLS0rXG4gKiAgfCAgIHwgMCB8ICAgfCAgICB8IDAgfCAgIHwgMSB8XG4gKiAgKy0tLSstLS0rLS0tKyAgICArLS0tKy0tLSstLS0rXG4gKiAgfCAzIHwgICB8IDEgfCAgICB8ICAgfCAgIHwgICB8XG4gKiAgKy0tLSstLS0rLS0tKyAgICArLS0tKy0tLSstLS0rXG4gKiAgfCAgIHwgMiB8ICAgfCAgICB8IDMgfCAgIHwgMiB8XG4gKiAgKy0tLSstLS0rLS0tKyAgICArLS0tKy0tLSstLS0rXG4gKlxuICogIFdoZW4gYWxsb3dEaWFnb25hbCBpcyB0cnVlLCBpZiBvZmZzZXRzW2ldIGlzIHZhbGlkLCB0aGVuXG4gKiAgZGlhZ29uYWxPZmZzZXRzW2ldIGFuZFxuICogIGRpYWdvbmFsT2Zmc2V0c1soaSArIDEpICUgNF0gaXMgdmFsaWQuXG4gKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYWxsb3dEaWFnb25hbFxuICogQHBhcmFtIHtib29sZWFufSBkb250Q3Jvc3NDb3JuZXJzXG4gKi9cbkdyaWQucHJvdG90eXBlLmdldE5laWdoYm9ycyA9IGZ1bmN0aW9uKG5vZGUsIGFsbG93RGlhZ29uYWwsIGRvbnRDcm9zc0Nvcm5lcnMpIHtcbiAgICB2YXIgeCA9IG5vZGUueCxcbiAgICAgICAgeSA9IG5vZGUueSxcbiAgICAgICAgbmVpZ2hib3JzID0gW10sXG4gICAgICAgIHMwID0gZmFsc2UsIGQwID0gZmFsc2UsXG4gICAgICAgIHMxID0gZmFsc2UsIGQxID0gZmFsc2UsXG4gICAgICAgIHMyID0gZmFsc2UsIGQyID0gZmFsc2UsXG4gICAgICAgIHMzID0gZmFsc2UsIGQzID0gZmFsc2UsXG4gICAgICAgIG5vZGVzID0gdGhpcy5ub2RlcztcblxuICAgIC8vIOKGkVxuICAgIGlmICh0aGlzLmlzV2Fsa2FibGVBdCh4LCB5IC0gMSkpIHtcbiAgICAgICAgbmVpZ2hib3JzLnB1c2gobm9kZXNbeSAtIDFdW3hdKTtcbiAgICAgICAgczAgPSB0cnVlO1xuICAgIH1cbiAgICAvLyDihpJcbiAgICBpZiAodGhpcy5pc1dhbGthYmxlQXQoeCArIDEsIHkpKSB7XG4gICAgICAgIG5laWdoYm9ycy5wdXNoKG5vZGVzW3ldW3ggKyAxXSk7XG4gICAgICAgIHMxID0gdHJ1ZTtcbiAgICB9XG4gICAgLy8g4oaTXG4gICAgaWYgKHRoaXMuaXNXYWxrYWJsZUF0KHgsIHkgKyAxKSkge1xuICAgICAgICBuZWlnaGJvcnMucHVzaChub2Rlc1t5ICsgMV1beF0pO1xuICAgICAgICBzMiA9IHRydWU7XG4gICAgfVxuICAgIC8vIOKGkFxuICAgIGlmICh0aGlzLmlzV2Fsa2FibGVBdCh4IC0gMSwgeSkpIHtcbiAgICAgICAgbmVpZ2hib3JzLnB1c2gobm9kZXNbeV1beCAtIDFdKTtcbiAgICAgICAgczMgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghYWxsb3dEaWFnb25hbCkge1xuICAgICAgICByZXR1cm4gbmVpZ2hib3JzO1xuICAgIH1cblxuICAgIGlmIChkb250Q3Jvc3NDb3JuZXJzKSB7XG4gICAgICAgIGQwID0gczMgJiYgczA7XG4gICAgICAgIGQxID0gczAgJiYgczE7XG4gICAgICAgIGQyID0gczEgJiYgczI7XG4gICAgICAgIGQzID0gczIgJiYgczM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZDAgPSBzMyB8fCBzMDtcbiAgICAgICAgZDEgPSBzMCB8fCBzMTtcbiAgICAgICAgZDIgPSBzMSB8fCBzMjtcbiAgICAgICAgZDMgPSBzMiB8fCBzMztcbiAgICB9XG5cbiAgICAvLyDihpZcbiAgICBpZiAoZDAgJiYgdGhpcy5pc1dhbGthYmxlQXQoeCAtIDEsIHkgLSAxKSkge1xuICAgICAgICBuZWlnaGJvcnMucHVzaChub2Rlc1t5IC0gMV1beCAtIDFdKTtcbiAgICB9XG4gICAgLy8g4oaXXG4gICAgaWYgKGQxICYmIHRoaXMuaXNXYWxrYWJsZUF0KHggKyAxLCB5IC0gMSkpIHtcbiAgICAgICAgbmVpZ2hib3JzLnB1c2gobm9kZXNbeSAtIDFdW3ggKyAxXSk7XG4gICAgfVxuICAgIC8vIOKGmFxuICAgIGlmIChkMiAmJiB0aGlzLmlzV2Fsa2FibGVBdCh4ICsgMSwgeSArIDEpKSB7XG4gICAgICAgIG5laWdoYm9ycy5wdXNoKG5vZGVzW3kgKyAxXVt4ICsgMV0pO1xuICAgIH1cbiAgICAvLyDihplcbiAgICBpZiAoZDMgJiYgdGhpcy5pc1dhbGthYmxlQXQoeCAtIDEsIHkgKyAxKSkge1xuICAgICAgICBuZWlnaGJvcnMucHVzaChub2Rlc1t5ICsgMV1beCAtIDFdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmVpZ2hib3JzO1xufTtcblxuXG4vKipcbiAqIEdldCBhIGNsb25lIG9mIHRoaXMgZ3JpZC5cbiAqIEByZXR1cm4ge0dyaWR9IENsb25lZCBncmlkLlxuICovXG5HcmlkLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpLCBqLFxuXG4gICAgICAgIHdpZHRoID0gdGhpcy53aWR0aCxcbiAgICAgICAgaGVpZ2h0ID0gdGhpcy5oZWlnaHQsXG4gICAgICAgIHRoaXNOb2RlcyA9IHRoaXMubm9kZXMsXG5cbiAgICAgICAgbmV3R3JpZCA9IG5ldyBHcmlkKHdpZHRoLCBoZWlnaHQpLFxuICAgICAgICBuZXdOb2RlcyA9IG5ldyBBcnJheShoZWlnaHQpLFxuICAgICAgICByb3c7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgaGVpZ2h0OyArK2kpIHtcbiAgICAgICAgbmV3Tm9kZXNbaV0gPSBuZXcgQXJyYXkod2lkdGgpO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgd2lkdGg7ICsraikge1xuICAgICAgICAgICAgbmV3Tm9kZXNbaV1bal0gPSBuZXcgTm9kZShqLCBpLCB0aGlzTm9kZXNbaV1bal0ud2Fsa2FibGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbmV3R3JpZC5ub2RlcyA9IG5ld05vZGVzO1xuXG4gICAgcmV0dXJuIG5ld0dyaWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyaWQ7XG4iLCIvKipcbiAqIEBuYW1lc3BhY2UgUEYuSGV1cmlzdGljXG4gKiBAZGVzY3JpcHRpb24gQSBjb2xsZWN0aW9uIG9mIGhldXJpc3RpYyBmdW5jdGlvbnMuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIC8qKlxuICAgKiBNYW5oYXR0YW4gZGlzdGFuY2UuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBkeCAtIERpZmZlcmVuY2UgaW4geC5cbiAgICogQHBhcmFtIHtudW1iZXJ9IGR5IC0gRGlmZmVyZW5jZSBpbiB5LlxuICAgKiBAcmV0dXJuIHtudW1iZXJ9IGR4ICsgZHlcbiAgICovXG4gIG1hbmhhdHRhbjogZnVuY3Rpb24oZHgsIGR5KSB7XG4gICAgICByZXR1cm4gZHggKyBkeTtcbiAgfSxcblxuICAvKipcbiAgICogRXVjbGlkZWFuIGRpc3RhbmNlLlxuICAgKiBAcGFyYW0ge251bWJlcn0gZHggLSBEaWZmZXJlbmNlIGluIHguXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBkeSAtIERpZmZlcmVuY2UgaW4geS5cbiAgICogQHJldHVybiB7bnVtYmVyfSBzcXJ0KGR4ICogZHggKyBkeSAqIGR5KVxuICAgKi9cbiAgZXVjbGlkZWFuOiBmdW5jdGlvbihkeCwgZHkpIHtcbiAgICAgIHJldHVybiBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVieXNoZXYgZGlzdGFuY2UuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBkeCAtIERpZmZlcmVuY2UgaW4geC5cbiAgICogQHBhcmFtIHtudW1iZXJ9IGR5IC0gRGlmZmVyZW5jZSBpbiB5LlxuICAgKiBAcmV0dXJuIHtudW1iZXJ9IG1heChkeCwgZHkpXG4gICAqL1xuICBjaGVieXNoZXY6IGZ1bmN0aW9uKGR4LCBkeSkge1xuICAgICAgcmV0dXJuIE1hdGgubWF4KGR4LCBkeSk7XG4gIH1cblxufTtcbiIsIi8qKlxuICogQSBub2RlIGluIGdyaWQuIFxuICogVGhpcyBjbGFzcyBob2xkcyBzb21lIGJhc2ljIGluZm9ybWF0aW9uIGFib3V0IGEgbm9kZSBhbmQgY3VzdG9tIFxuICogYXR0cmlidXRlcyBtYXkgYmUgYWRkZWQsIGRlcGVuZGluZyBvbiB0aGUgYWxnb3JpdGhtcycgbmVlZHMuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7bnVtYmVyfSB4IC0gVGhlIHggY29vcmRpbmF0ZSBvZiB0aGUgbm9kZSBvbiB0aGUgZ3JpZC5cbiAqIEBwYXJhbSB7bnVtYmVyfSB5IC0gVGhlIHkgY29vcmRpbmF0ZSBvZiB0aGUgbm9kZSBvbiB0aGUgZ3JpZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW3dhbGthYmxlXSAtIFdoZXRoZXIgdGhpcyBub2RlIGlzIHdhbGthYmxlLlxuICovXG5mdW5jdGlvbiBOb2RlKHgsIHksIHdhbGthYmxlKSB7XG4gICAgLyoqXG4gICAgICogVGhlIHggY29vcmRpbmF0ZSBvZiB0aGUgbm9kZSBvbiB0aGUgZ3JpZC5cbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnggPSB4O1xuICAgIC8qKlxuICAgICAqIFRoZSB5IGNvb3JkaW5hdGUgb2YgdGhlIG5vZGUgb24gdGhlIGdyaWQuXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICovXG4gICAgdGhpcy55ID0geTtcbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIHRoaXMgbm9kZSBjYW4gYmUgd2Fsa2VkIHRocm91Z2guXG4gICAgICogQHR5cGUgYm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMud2Fsa2FibGUgPSAod2Fsa2FibGUgPT09IHVuZGVmaW5lZCA/IHRydWUgOiB3YWxrYWJsZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE5vZGU7XG4iLCIvKipcbiAqIEJhY2t0cmFjZSBhY2NvcmRpbmcgdG8gdGhlIHBhcmVudCByZWNvcmRzIGFuZCByZXR1cm4gdGhlIHBhdGguXG4gKiAoaW5jbHVkaW5nIGJvdGggc3RhcnQgYW5kIGVuZCBub2RlcylcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSBFbmQgbm9kZVxuICogQHJldHVybiB7QXJyYXkuPEFycmF5LjxudW1iZXI+Pn0gdGhlIHBhdGhcbiAqL1xuZnVuY3Rpb24gYmFja3RyYWNlKG5vZGUpIHtcbiAgICB2YXIgcGF0aCA9IFtbbm9kZS54LCBub2RlLnldXTtcbiAgICB3aGlsZSAobm9kZS5wYXJlbnQpIHtcbiAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICAgICAgICBwYXRoLnB1c2goW25vZGUueCwgbm9kZS55XSk7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLnJldmVyc2UoKTtcbn1cbmV4cG9ydHMuYmFja3RyYWNlID0gYmFja3RyYWNlO1xuXG4vKipcbiAqIEJhY2t0cmFjZSBmcm9tIHN0YXJ0IGFuZCBlbmQgbm9kZSwgYW5kIHJldHVybiB0aGUgcGF0aC5cbiAqIChpbmNsdWRpbmcgYm90aCBzdGFydCBhbmQgZW5kIG5vZGVzKVxuICogQHBhcmFtIHtOb2RlfVxuICogQHBhcmFtIHtOb2RlfVxuICovXG5mdW5jdGlvbiBiaUJhY2t0cmFjZShub2RlQSwgbm9kZUIpIHtcbiAgICB2YXIgcGF0aEEgPSBiYWNrdHJhY2Uobm9kZUEpLFxuICAgICAgICBwYXRoQiA9IGJhY2t0cmFjZShub2RlQik7XG4gICAgcmV0dXJuIHBhdGhBLmNvbmNhdChwYXRoQi5yZXZlcnNlKCkpO1xufVxuZXhwb3J0cy5iaUJhY2t0cmFjZSA9IGJpQmFja3RyYWNlO1xuXG4vKipcbiAqIENvbXB1dGUgdGhlIGxlbmd0aCBvZiB0aGUgcGF0aC5cbiAqIEBwYXJhbSB7QXJyYXkuPEFycmF5LjxudW1iZXI+Pn0gcGF0aCBUaGUgcGF0aFxuICogQHJldHVybiB7bnVtYmVyfSBUaGUgbGVuZ3RoIG9mIHRoZSBwYXRoXG4gKi9cbmZ1bmN0aW9uIHBhdGhMZW5ndGgocGF0aCkge1xuICAgIHZhciBpLCBzdW0gPSAwLCBhLCBiLCBkeCwgZHk7XG4gICAgZm9yIChpID0gMTsgaSA8IHBhdGgubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgYSA9IHBhdGhbaSAtIDFdO1xuICAgICAgICBiID0gcGF0aFtpXTtcbiAgICAgICAgZHggPSBhWzBdIC0gYlswXTtcbiAgICAgICAgZHkgPSBhWzFdIC0gYlsxXTtcbiAgICAgICAgc3VtICs9IE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSk7XG4gICAgfVxuICAgIHJldHVybiBzdW07XG59XG5leHBvcnRzLnBhdGhMZW5ndGggPSBwYXRoTGVuZ3RoO1xuXG5cbi8qKlxuICogR2l2ZW4gdGhlIHN0YXJ0IGFuZCBlbmQgY29vcmRpbmF0ZXMsIHJldHVybiBhbGwgdGhlIGNvb3JkaW5hdGVzIGx5aW5nXG4gKiBvbiB0aGUgbGluZSBmb3JtZWQgYnkgdGhlc2UgY29vcmRpbmF0ZXMsIGJhc2VkIG9uIEJyZXNlbmhhbSdzIGFsZ29yaXRobS5cbiAqIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQnJlc2VuaGFtJ3NfbGluZV9hbGdvcml0aG0jU2ltcGxpZmljYXRpb25cbiAqIEBwYXJhbSB7bnVtYmVyfSB4MCBTdGFydCB4IGNvb3JkaW5hdGVcbiAqIEBwYXJhbSB7bnVtYmVyfSB5MCBTdGFydCB5IGNvb3JkaW5hdGVcbiAqIEBwYXJhbSB7bnVtYmVyfSB4MSBFbmQgeCBjb29yZGluYXRlXG4gKiBAcGFyYW0ge251bWJlcn0geTEgRW5kIHkgY29vcmRpbmF0ZVxuICogQHJldHVybiB7QXJyYXkuPEFycmF5LjxudW1iZXI+Pn0gVGhlIGNvb3JkaW5hdGVzIG9uIHRoZSBsaW5lXG4gKi9cbmZ1bmN0aW9uIGludGVycG9sYXRlKHgwLCB5MCwgeDEsIHkxKSB7XG4gICAgdmFyIGFicyA9IE1hdGguYWJzLFxuICAgICAgICBsaW5lID0gW10sXG4gICAgICAgIHN4LCBzeSwgZHgsIGR5LCBlcnIsIGUyO1xuXG4gICAgZHggPSBhYnMoeDEgLSB4MCk7XG4gICAgZHkgPSBhYnMoeTEgLSB5MCk7XG5cbiAgICBzeCA9ICh4MCA8IHgxKSA/IDEgOiAtMTtcbiAgICBzeSA9ICh5MCA8IHkxKSA/IDEgOiAtMTtcblxuICAgIGVyciA9IGR4IC0gZHk7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBsaW5lLnB1c2goW3gwLCB5MF0pO1xuXG4gICAgICAgIGlmICh4MCA9PT0geDEgJiYgeTAgPT09IHkxKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZTIgPSAyICogZXJyO1xuICAgICAgICBpZiAoZTIgPiAtZHkpIHtcbiAgICAgICAgICAgIGVyciA9IGVyciAtIGR5O1xuICAgICAgICAgICAgeDAgPSB4MCArIHN4O1xuICAgICAgICB9XG4gICAgICAgIGlmIChlMiA8IGR4KSB7XG4gICAgICAgICAgICBlcnIgPSBlcnIgKyBkeDtcbiAgICAgICAgICAgIHkwID0geTAgKyBzeTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsaW5lO1xufVxuZXhwb3J0cy5pbnRlcnBvbGF0ZSA9IGludGVycG9sYXRlO1xuXG5cbi8qKlxuICogR2l2ZW4gYSBjb21wcmVzc2VkIHBhdGgsIHJldHVybiBhIG5ldyBwYXRoIHRoYXQgaGFzIGFsbCB0aGUgc2VnbWVudHNcbiAqIGluIGl0IGludGVycG9sYXRlZC5cbiAqIEBwYXJhbSB7QXJyYXkuPEFycmF5LjxudW1iZXI+Pn0gcGF0aCBUaGUgcGF0aFxuICogQHJldHVybiB7QXJyYXkuPEFycmF5LjxudW1iZXI+Pn0gZXhwYW5kZWQgcGF0aFxuICovXG5mdW5jdGlvbiBleHBhbmRQYXRoKHBhdGgpIHtcbiAgICB2YXIgZXhwYW5kZWQgPSBbXSxcbiAgICAgICAgbGVuID0gcGF0aC5sZW5ndGgsXG4gICAgICAgIGNvb3JkMCwgY29vcmQxLFxuICAgICAgICBpbnRlcnBvbGF0ZWQsXG4gICAgICAgIGludGVycG9sYXRlZExlbixcbiAgICAgICAgaSwgajtcblxuICAgIGlmIChsZW4gPCAyKSB7XG4gICAgICAgIHJldHVybiBleHBhbmRlZDtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuIC0gMTsgKytpKSB7XG4gICAgICAgIGNvb3JkMCA9IHBhdGhbaV07XG4gICAgICAgIGNvb3JkMSA9IHBhdGhbaSArIDFdO1xuXG4gICAgICAgIGludGVycG9sYXRlZCA9IGludGVycG9sYXRlKGNvb3JkMFswXSwgY29vcmQwWzFdLCBjb29yZDFbMF0sIGNvb3JkMVsxXSk7XG4gICAgICAgIGludGVycG9sYXRlZExlbiA9IGludGVycG9sYXRlZC5sZW5ndGg7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCBpbnRlcnBvbGF0ZWRMZW4gLSAxOyArK2opIHtcbiAgICAgICAgICAgIGV4cGFuZGVkLnB1c2goaW50ZXJwb2xhdGVkW2pdKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBleHBhbmRlZC5wdXNoKHBhdGhbbGVuIC0gMV0pO1xuXG4gICAgcmV0dXJuIGV4cGFuZGVkO1xufVxuZXhwb3J0cy5leHBhbmRQYXRoID0gZXhwYW5kUGF0aDtcblxuXG4vKipcbiAqIFNtb290aGVuIHRoZSBnaXZlIHBhdGguXG4gKiBUaGUgb3JpZ2luYWwgcGF0aCB3aWxsIG5vdCBiZSBtb2RpZmllZDsgYSBuZXcgcGF0aCB3aWxsIGJlIHJldHVybmVkLlxuICogQHBhcmFtIHtQRi5HcmlkfSBncmlkXG4gKiBAcGFyYW0ge0FycmF5LjxBcnJheS48bnVtYmVyPj59IHBhdGggVGhlIHBhdGhcbiAqL1xuZnVuY3Rpb24gc21vb3RoZW5QYXRoKGdyaWQsIHBhdGgpIHtcbiAgICB2YXIgbGVuID0gcGF0aC5sZW5ndGgsXG4gICAgICAgIHgwID0gcGF0aFswXVswXSwgICAgICAgIC8vIHBhdGggc3RhcnQgeFxuICAgICAgICB5MCA9IHBhdGhbMF1bMV0sICAgICAgICAvLyBwYXRoIHN0YXJ0IHlcbiAgICAgICAgeDEgPSBwYXRoW2xlbiAtIDFdWzBdLCAgLy8gcGF0aCBlbmQgeFxuICAgICAgICB5MSA9IHBhdGhbbGVuIC0gMV1bMV0sICAvLyBwYXRoIGVuZCB5XG4gICAgICAgIHN4LCBzeSwgICAgICAgICAgICAgICAgIC8vIGN1cnJlbnQgc3RhcnQgY29vcmRpbmF0ZVxuICAgICAgICBleCwgZXksICAgICAgICAgICAgICAgICAvLyBjdXJyZW50IGVuZCBjb29yZGluYXRlXG4gICAgICAgIGx4LCBseSwgICAgICAgICAgICAgICAgIC8vIGxhc3QgdmFsaWQgZW5kIGNvb3JkaW5hdGVcbiAgICAgICAgbmV3UGF0aCxcbiAgICAgICAgaSwgaiwgY29vcmQsIGxpbmUsIHRlc3RDb29yZCwgYmxvY2tlZDtcblxuICAgIHN4ID0geDA7XG4gICAgc3kgPSB5MDtcbiAgICBseCA9IHBhdGhbMV1bMF07XG4gICAgbHkgPSBwYXRoWzFdWzFdO1xuICAgIG5ld1BhdGggPSBbW3N4LCBzeV1dO1xuXG4gICAgZm9yIChpID0gMjsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgIGNvb3JkID0gcGF0aFtpXTtcbiAgICAgICAgZXggPSBjb29yZFswXTtcbiAgICAgICAgZXkgPSBjb29yZFsxXTtcbiAgICAgICAgbGluZSA9IGludGVycG9sYXRlKHN4LCBzeSwgZXgsIGV5KTtcblxuICAgICAgICBibG9ja2VkID0gZmFsc2U7XG4gICAgICAgIGZvciAoaiA9IDE7IGogPCBsaW5lLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgICB0ZXN0Q29vcmQgPSBsaW5lW2pdO1xuXG4gICAgICAgICAgICBpZiAoIWdyaWQuaXNXYWxrYWJsZUF0KHRlc3RDb29yZFswXSwgdGVzdENvb3JkWzFdKSkge1xuICAgICAgICAgICAgICAgIGJsb2NrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIG5ld1BhdGgucHVzaChbbHgsIGx5XSk7XG4gICAgICAgICAgICAgICAgc3ggPSBseDtcbiAgICAgICAgICAgICAgICBzeSA9IGx5O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghYmxvY2tlZCkge1xuICAgICAgICAgICAgbHggPSBleDtcbiAgICAgICAgICAgIGx5ID0gZXk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgbmV3UGF0aC5wdXNoKFt4MSwgeTFdKTtcblxuICAgIHJldHVybiBuZXdQYXRoO1xufVxuZXhwb3J0cy5zbW9vdGhlblBhdGggPSBzbW9vdGhlblBhdGg7XG5cblxuLyoqXG4gKiBDb21wcmVzcyBhIHBhdGgsIHJlbW92ZSByZWR1bmRhbnQgbm9kZXMgd2l0aG91dCBhbHRlcmluZyB0aGUgc2hhcGVcbiAqIFRoZSBvcmlnaW5hbCBwYXRoIGlzIG5vdCBtb2RpZmllZFxuICogQHBhcmFtIHtBcnJheS48QXJyYXkuPG51bWJlcj4+fSBwYXRoIFRoZSBwYXRoXG4gKiBAcmV0dXJuIHtBcnJheS48QXJyYXkuPG51bWJlcj4+fSBUaGUgY29tcHJlc3NlZCBwYXRoXG4gKi9cbmZ1bmN0aW9uIGNvbXByZXNzUGF0aChwYXRoKSB7XG5cbiAgICAvLyBub3RoaW5nIHRvIGNvbXByZXNzXG4gICAgaWYocGF0aC5sZW5ndGggPCAzKSB7XG4gICAgICAgIHJldHVybiBwYXRoO1xuICAgIH1cblxuICAgIHZhciBjb21wcmVzc2VkID0gW10sXG4gICAgICAgIHN4ID0gcGF0aFswXVswXSwgLy8gc3RhcnQgeFxuICAgICAgICBzeSA9IHBhdGhbMF1bMV0sIC8vIHN0YXJ0IHlcbiAgICAgICAgcHggPSBwYXRoWzFdWzBdLCAvLyBzZWNvbmQgcG9pbnQgeFxuICAgICAgICBweSA9IHBhdGhbMV1bMV0sIC8vIHNlY29uZCBwb2ludCB5XG4gICAgICAgIGR4ID0gcHggLSBzeCwgLy8gZGlyZWN0aW9uIGJldHdlZW4gdGhlIHR3byBwb2ludHNcbiAgICAgICAgZHkgPSBweSAtIHN5LCAvLyBkaXJlY3Rpb24gYmV0d2VlbiB0aGUgdHdvIHBvaW50c1xuICAgICAgICBseCwgbHksXG4gICAgICAgIGxkeCwgbGR5LFxuICAgICAgICBzcSwgaTtcblxuICAgIC8vIG5vcm1hbGl6ZSB0aGUgZGlyZWN0aW9uXG4gICAgc3EgPSBNYXRoLnNxcnQoZHgqZHggKyBkeSpkeSk7XG4gICAgZHggLz0gc3E7XG4gICAgZHkgLz0gc3E7XG5cbiAgICAvLyBzdGFydCB0aGUgbmV3IHBhdGhcbiAgICBjb21wcmVzc2VkLnB1c2goW3N4LHN5XSk7XG5cbiAgICBmb3IoaSA9IDI7IGkgPCBwYXRoLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgICAgLy8gc3RvcmUgdGhlIGxhc3QgcG9pbnRcbiAgICAgICAgbHggPSBweDtcbiAgICAgICAgbHkgPSBweTtcblxuICAgICAgICAvLyBzdG9yZSB0aGUgbGFzdCBkaXJlY3Rpb25cbiAgICAgICAgbGR4ID0gZHg7XG4gICAgICAgIGxkeSA9IGR5O1xuXG4gICAgICAgIC8vIG5leHQgcG9pbnRcbiAgICAgICAgcHggPSBwYXRoW2ldWzBdO1xuICAgICAgICBweSA9IHBhdGhbaV1bMV07XG5cbiAgICAgICAgLy8gbmV4dCBkaXJlY3Rpb25cbiAgICAgICAgZHggPSBweCAtIGx4O1xuICAgICAgICBkeSA9IHB5IC0gbHk7XG5cbiAgICAgICAgLy8gbm9ybWFsaXplXG4gICAgICAgIHNxID0gTWF0aC5zcXJ0KGR4KmR4ICsgZHkqZHkpO1xuICAgICAgICBkeCAvPSBzcTtcbiAgICAgICAgZHkgLz0gc3E7XG5cbiAgICAgICAgLy8gaWYgdGhlIGRpcmVjdGlvbiBoYXMgY2hhbmdlZCwgc3RvcmUgdGhlIHBvaW50XG4gICAgICAgIGlmICggZHggIT09IGxkeCB8fCBkeSAhPT0gbGR5ICkge1xuICAgICAgICAgICAgY29tcHJlc3NlZC5wdXNoKFtseCxseV0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gc3RvcmUgdGhlIGxhc3QgcG9pbnRcbiAgICBjb21wcmVzc2VkLnB1c2goW3B4LHB5XSk7XG5cbiAgICByZXR1cm4gY29tcHJlc3NlZDtcbn1cbmV4cG9ydHMuY29tcHJlc3NQYXRoID0gY29tcHJlc3NQYXRoO1xuIiwidmFyIEhlYXAgICAgICAgPSByZXF1aXJlKCdoZWFwJyk7XG52YXIgVXRpbCAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvVXRpbCcpO1xudmFyIEhldXJpc3RpYyAgPSByZXF1aXJlKCcuLi9jb3JlL0hldXJpc3RpYycpO1xuXG4vKipcbiAqIEEqIHBhdGgtZmluZGVyLlxuICogYmFzZWQgdXBvbiBodHRwczovL2dpdGh1Yi5jb20vYmdyaW5zL2phdmFzY3JpcHQtYXN0YXJcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtvYmplY3R9IG9wdFxuICogQHBhcmFtIHtib29sZWFufSBvcHQuYWxsb3dEaWFnb25hbCBXaGV0aGVyIGRpYWdvbmFsIG1vdmVtZW50IGlzIGFsbG93ZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5kb250Q3Jvc3NDb3JuZXJzIERpc2FsbG93IGRpYWdvbmFsIG1vdmVtZW50IHRvdWNoaW5nIGJsb2NrIGNvcm5lcnMuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHQuaGV1cmlzdGljIEhldXJpc3RpYyBmdW5jdGlvbiB0byBlc3RpbWF0ZSB0aGUgZGlzdGFuY2VcbiAqICAgICAoZGVmYXVsdHMgdG8gbWFuaGF0dGFuKS5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gb3B0LndlaWdodCBXZWlnaHQgdG8gYXBwbHkgdG8gdGhlIGhldXJpc3RpYyB0byBhbGxvdyBmb3Igc3Vib3B0aW1hbCBwYXRocywgXG4gKiAgICAgaW4gb3JkZXIgdG8gc3BlZWQgdXAgdGhlIHNlYXJjaC5cbiAqL1xuZnVuY3Rpb24gQVN0YXJGaW5kZXIob3B0KSB7XG4gICAgb3B0ID0gb3B0IHx8IHt9O1xuICAgIHRoaXMuYWxsb3dEaWFnb25hbCA9IG9wdC5hbGxvd0RpYWdvbmFsO1xuICAgIHRoaXMuZG9udENyb3NzQ29ybmVycyA9IG9wdC5kb250Q3Jvc3NDb3JuZXJzO1xuICAgIHRoaXMuaGV1cmlzdGljID0gb3B0LmhldXJpc3RpYyB8fCBIZXVyaXN0aWMubWFuaGF0dGFuO1xuICAgIHRoaXMud2VpZ2h0ID0gb3B0LndlaWdodCB8fCAxO1xufVxuXG4vKipcbiAqIEZpbmQgYW5kIHJldHVybiB0aGUgdGhlIHBhdGguXG4gKiBAcmV0dXJuIHtBcnJheS48W251bWJlciwgbnVtYmVyXT59IFRoZSBwYXRoLCBpbmNsdWRpbmcgYm90aCBzdGFydCBhbmRcbiAqICAgICBlbmQgcG9zaXRpb25zLlxuICovXG5BU3RhckZpbmRlci5wcm90b3R5cGUuZmluZFBhdGggPSBmdW5jdGlvbihzdGFydFgsIHN0YXJ0WSwgZW5kWCwgZW5kWSwgZ3JpZCkge1xuICAgIHZhciBvcGVuTGlzdCA9IG5ldyBIZWFwKGZ1bmN0aW9uKG5vZGVBLCBub2RlQikge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGVBLmYgLSBub2RlQi5mO1xuICAgICAgICB9KSxcbiAgICAgICAgc3RhcnROb2RlID0gZ3JpZC5nZXROb2RlQXQoc3RhcnRYLCBzdGFydFkpLFxuICAgICAgICBlbmROb2RlID0gZ3JpZC5nZXROb2RlQXQoZW5kWCwgZW5kWSksXG4gICAgICAgIGhldXJpc3RpYyA9IHRoaXMuaGV1cmlzdGljLFxuICAgICAgICBhbGxvd0RpYWdvbmFsID0gdGhpcy5hbGxvd0RpYWdvbmFsLFxuICAgICAgICBkb250Q3Jvc3NDb3JuZXJzID0gdGhpcy5kb250Q3Jvc3NDb3JuZXJzLFxuICAgICAgICB3ZWlnaHQgPSB0aGlzLndlaWdodCxcbiAgICAgICAgYWJzID0gTWF0aC5hYnMsIFNRUlQyID0gTWF0aC5TUVJUMixcbiAgICAgICAgbm9kZSwgbmVpZ2hib3JzLCBuZWlnaGJvciwgaSwgbCwgeCwgeSwgbmc7XG5cbiAgICAvLyBzZXQgdGhlIGBnYCBhbmQgYGZgIHZhbHVlIG9mIHRoZSBzdGFydCBub2RlIHRvIGJlIDBcbiAgICBzdGFydE5vZGUuZyA9IDA7XG4gICAgc3RhcnROb2RlLmYgPSAwO1xuXG4gICAgLy8gcHVzaCB0aGUgc3RhcnQgbm9kZSBpbnRvIHRoZSBvcGVuIGxpc3RcbiAgICBvcGVuTGlzdC5wdXNoKHN0YXJ0Tm9kZSk7XG4gICAgc3RhcnROb2RlLm9wZW5lZCA9IHRydWU7XG5cbiAgICAvLyB3aGlsZSB0aGUgb3BlbiBsaXN0IGlzIG5vdCBlbXB0eVxuICAgIHdoaWxlICghb3Blbkxpc3QuZW1wdHkoKSkge1xuICAgICAgICAvLyBwb3AgdGhlIHBvc2l0aW9uIG9mIG5vZGUgd2hpY2ggaGFzIHRoZSBtaW5pbXVtIGBmYCB2YWx1ZS5cbiAgICAgICAgbm9kZSA9IG9wZW5MaXN0LnBvcCgpO1xuICAgICAgICBub2RlLmNsb3NlZCA9IHRydWU7XG5cbiAgICAgICAgLy8gaWYgcmVhY2hlZCB0aGUgZW5kIHBvc2l0aW9uLCBjb25zdHJ1Y3QgdGhlIHBhdGggYW5kIHJldHVybiBpdFxuICAgICAgICBpZiAobm9kZSA9PT0gZW5kTm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIFV0aWwuYmFja3RyYWNlKGVuZE5vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZ2V0IG5laWdib3VycyBvZiB0aGUgY3VycmVudCBub2RlXG4gICAgICAgIG5laWdoYm9ycyA9IGdyaWQuZ2V0TmVpZ2hib3JzKG5vZGUsIGFsbG93RGlhZ29uYWwsIGRvbnRDcm9zc0Nvcm5lcnMpO1xuICAgICAgICBmb3IgKGkgPSAwLCBsID0gbmVpZ2hib3JzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgbmVpZ2hib3IgPSBuZWlnaGJvcnNbaV07XG5cbiAgICAgICAgICAgIGlmIChuZWlnaGJvci5jbG9zZWQpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgeCA9IG5laWdoYm9yLng7XG4gICAgICAgICAgICB5ID0gbmVpZ2hib3IueTtcblxuICAgICAgICAgICAgLy8gZ2V0IHRoZSBkaXN0YW5jZSBiZXR3ZWVuIGN1cnJlbnQgbm9kZSBhbmQgdGhlIG5laWdoYm9yXG4gICAgICAgICAgICAvLyBhbmQgY2FsY3VsYXRlIHRoZSBuZXh0IGcgc2NvcmVcbiAgICAgICAgICAgIG5nID0gbm9kZS5nICsgKCh4IC0gbm9kZS54ID09PSAwIHx8IHkgLSBub2RlLnkgPT09IDApID8gMSA6IFNRUlQyKTtcblxuICAgICAgICAgICAgLy8gY2hlY2sgaWYgdGhlIG5laWdoYm9yIGhhcyBub3QgYmVlbiBpbnNwZWN0ZWQgeWV0LCBvclxuICAgICAgICAgICAgLy8gY2FuIGJlIHJlYWNoZWQgd2l0aCBzbWFsbGVyIGNvc3QgZnJvbSB0aGUgY3VycmVudCBub2RlXG4gICAgICAgICAgICBpZiAoIW5laWdoYm9yLm9wZW5lZCB8fCBuZyA8IG5laWdoYm9yLmcpIHtcbiAgICAgICAgICAgICAgICBuZWlnaGJvci5nID0gbmc7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3IuaCA9IG5laWdoYm9yLmggfHwgd2VpZ2h0ICogaGV1cmlzdGljKGFicyh4IC0gZW5kWCksIGFicyh5IC0gZW5kWSkpO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLmYgPSBuZWlnaGJvci5nICsgbmVpZ2hib3IuaDtcbiAgICAgICAgICAgICAgICBuZWlnaGJvci5wYXJlbnQgPSBub2RlO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFuZWlnaGJvci5vcGVuZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgb3Blbkxpc3QucHVzaChuZWlnaGJvcik7XG4gICAgICAgICAgICAgICAgICAgIG5laWdoYm9yLm9wZW5lZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIG5laWdoYm9yIGNhbiBiZSByZWFjaGVkIHdpdGggc21hbGxlciBjb3N0LlxuICAgICAgICAgICAgICAgICAgICAvLyBTaW5jZSBpdHMgZiB2YWx1ZSBoYXMgYmVlbiB1cGRhdGVkLCB3ZSBoYXZlIHRvXG4gICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBpdHMgcG9zaXRpb24gaW4gdGhlIG9wZW4gbGlzdFxuICAgICAgICAgICAgICAgICAgICBvcGVuTGlzdC51cGRhdGVJdGVtKG5laWdoYm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gLy8gZW5kIGZvciBlYWNoIG5laWdoYm9yXG4gICAgfSAvLyBlbmQgd2hpbGUgbm90IG9wZW4gbGlzdCBlbXB0eVxuXG4gICAgLy8gZmFpbCB0byBmaW5kIHRoZSBwYXRoXG4gICAgcmV0dXJuIFtdO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBU3RhckZpbmRlcjtcbiIsInZhciBBU3RhckZpbmRlciA9IHJlcXVpcmUoJy4vQVN0YXJGaW5kZXInKTtcblxuLyoqXG4gKiBCZXN0LUZpcnN0LVNlYXJjaCBwYXRoLWZpbmRlci5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMgQVN0YXJGaW5kZXJcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0LmFsbG93RGlhZ29uYWwgV2hldGhlciBkaWFnb25hbCBtb3ZlbWVudCBpcyBhbGxvd2VkLlxuICogQHBhcmFtIHtib29sZWFufSBvcHQuZG9udENyb3NzQ29ybmVycyBEaXNhbGxvdyBkaWFnb25hbCBtb3ZlbWVudCB0b3VjaGluZyBibG9jayBjb3JuZXJzLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gb3B0LmhldXJpc3RpYyBIZXVyaXN0aWMgZnVuY3Rpb24gdG8gZXN0aW1hdGUgdGhlIGRpc3RhbmNlXG4gKiAgICAgKGRlZmF1bHRzIHRvIG1hbmhhdHRhbikuXG4gKi9cbmZ1bmN0aW9uIEJlc3RGaXJzdEZpbmRlcihvcHQpIHtcbiAgICBBU3RhckZpbmRlci5jYWxsKHRoaXMsIG9wdCk7XG5cbiAgICB2YXIgb3JpZyA9IHRoaXMuaGV1cmlzdGljO1xuICAgIHRoaXMuaGV1cmlzdGljID0gZnVuY3Rpb24oZHgsIGR5KSB7XG4gICAgICAgIHJldHVybiBvcmlnKGR4LCBkeSkgKiAxMDAwMDAwO1xuICAgIH07XG59O1xuXG5CZXN0Rmlyc3RGaW5kZXIucHJvdG90eXBlID0gbmV3IEFTdGFyRmluZGVyKCk7XG5CZXN0Rmlyc3RGaW5kZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQmVzdEZpcnN0RmluZGVyO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJlc3RGaXJzdEZpbmRlcjtcbiIsInZhciBIZWFwICAgICAgID0gcmVxdWlyZSgnaGVhcCcpO1xudmFyIFV0aWwgICAgICAgPSByZXF1aXJlKCcuLi9jb3JlL1V0aWwnKTtcbnZhciBIZXVyaXN0aWMgID0gcmVxdWlyZSgnLi4vY29yZS9IZXVyaXN0aWMnKTtcblxuLyoqXG4gKiBBKiBwYXRoLWZpbmRlci5cbiAqIGJhc2VkIHVwb24gaHR0cHM6Ly9naXRodWIuY29tL2Jncmlucy9qYXZhc2NyaXB0LWFzdGFyXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0LmFsbG93RGlhZ29uYWwgV2hldGhlciBkaWFnb25hbCBtb3ZlbWVudCBpcyBhbGxvd2VkLlxuICogQHBhcmFtIHtib29sZWFufSBvcHQuZG9udENyb3NzQ29ybmVycyBEaXNhbGxvdyBkaWFnb25hbCBtb3ZlbWVudCB0b3VjaGluZyBibG9jayBjb3JuZXJzLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gb3B0LmhldXJpc3RpYyBIZXVyaXN0aWMgZnVuY3Rpb24gdG8gZXN0aW1hdGUgdGhlIGRpc3RhbmNlXG4gKiAgICAgKGRlZmF1bHRzIHRvIG1hbmhhdHRhbikuXG4gKiBAcGFyYW0ge2ludGVnZXJ9IG9wdC53ZWlnaHQgV2VpZ2h0IHRvIGFwcGx5IHRvIHRoZSBoZXVyaXN0aWMgdG8gYWxsb3cgZm9yIHN1Ym9wdGltYWwgcGF0aHMsIFxuICogICAgIGluIG9yZGVyIHRvIHNwZWVkIHVwIHRoZSBzZWFyY2guXG4gKi9cbmZ1bmN0aW9uIEJpQVN0YXJGaW5kZXIob3B0KSB7XG4gICAgb3B0ID0gb3B0IHx8IHt9O1xuICAgIHRoaXMuYWxsb3dEaWFnb25hbCA9IG9wdC5hbGxvd0RpYWdvbmFsO1xuICAgIHRoaXMuZG9udENyb3NzQ29ybmVycyA9IG9wdC5kb250Q3Jvc3NDb3JuZXJzO1xuICAgIHRoaXMuaGV1cmlzdGljID0gb3B0LmhldXJpc3RpYyB8fCBIZXVyaXN0aWMubWFuaGF0dGFuO1xuICAgIHRoaXMud2VpZ2h0ID0gb3B0LndlaWdodCB8fCAxO1xufVxuXG4vKipcbiAqIEZpbmQgYW5kIHJldHVybiB0aGUgdGhlIHBhdGguXG4gKiBAcmV0dXJuIHtBcnJheS48W251bWJlciwgbnVtYmVyXT59IFRoZSBwYXRoLCBpbmNsdWRpbmcgYm90aCBzdGFydCBhbmRcbiAqICAgICBlbmQgcG9zaXRpb25zLlxuICovXG5CaUFTdGFyRmluZGVyLnByb3RvdHlwZS5maW5kUGF0aCA9IGZ1bmN0aW9uKHN0YXJ0WCwgc3RhcnRZLCBlbmRYLCBlbmRZLCBncmlkKSB7XG4gICAgdmFyIGNtcCA9IGZ1bmN0aW9uKG5vZGVBLCBub2RlQikge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGVBLmYgLSBub2RlQi5mO1xuICAgICAgICB9LFxuICAgICAgICBzdGFydE9wZW5MaXN0ID0gbmV3IEhlYXAoY21wKSxcbiAgICAgICAgZW5kT3Blbkxpc3QgPSBuZXcgSGVhcChjbXApLFxuICAgICAgICBzdGFydE5vZGUgPSBncmlkLmdldE5vZGVBdChzdGFydFgsIHN0YXJ0WSksXG4gICAgICAgIGVuZE5vZGUgPSBncmlkLmdldE5vZGVBdChlbmRYLCBlbmRZKSxcbiAgICAgICAgaGV1cmlzdGljID0gdGhpcy5oZXVyaXN0aWMsXG4gICAgICAgIGFsbG93RGlhZ29uYWwgPSB0aGlzLmFsbG93RGlhZ29uYWwsXG4gICAgICAgIGRvbnRDcm9zc0Nvcm5lcnMgPSB0aGlzLmRvbnRDcm9zc0Nvcm5lcnMsXG4gICAgICAgIHdlaWdodCA9IHRoaXMud2VpZ2h0LFxuICAgICAgICBhYnMgPSBNYXRoLmFicywgU1FSVDIgPSBNYXRoLlNRUlQyLFxuICAgICAgICBub2RlLCBuZWlnaGJvcnMsIG5laWdoYm9yLCBpLCBsLCB4LCB5LCBuZyxcbiAgICAgICAgQllfU1RBUlQgPSAxLCBCWV9FTkQgPSAyO1xuXG4gICAgLy8gc2V0IHRoZSBgZ2AgYW5kIGBmYCB2YWx1ZSBvZiB0aGUgc3RhcnQgbm9kZSB0byBiZSAwXG4gICAgLy8gYW5kIHB1c2ggaXQgaW50byB0aGUgc3RhcnQgb3BlbiBsaXN0XG4gICAgc3RhcnROb2RlLmcgPSAwO1xuICAgIHN0YXJ0Tm9kZS5mID0gMDtcbiAgICBzdGFydE9wZW5MaXN0LnB1c2goc3RhcnROb2RlKTtcbiAgICBzdGFydE5vZGUub3BlbmVkID0gQllfU1RBUlQ7XG5cbiAgICAvLyBzZXQgdGhlIGBnYCBhbmQgYGZgIHZhbHVlIG9mIHRoZSBlbmQgbm9kZSB0byBiZSAwXG4gICAgLy8gYW5kIHB1c2ggaXQgaW50byB0aGUgb3BlbiBvcGVuIGxpc3RcbiAgICBlbmROb2RlLmcgPSAwO1xuICAgIGVuZE5vZGUuZiA9IDA7XG4gICAgZW5kT3Blbkxpc3QucHVzaChlbmROb2RlKTtcbiAgICBlbmROb2RlLm9wZW5lZCA9IEJZX0VORDtcblxuICAgIC8vIHdoaWxlIGJvdGggdGhlIG9wZW4gbGlzdHMgYXJlIG5vdCBlbXB0eVxuICAgIHdoaWxlICghc3RhcnRPcGVuTGlzdC5lbXB0eSgpICYmICFlbmRPcGVuTGlzdC5lbXB0eSgpKSB7XG5cbiAgICAgICAgLy8gcG9wIHRoZSBwb3NpdGlvbiBvZiBzdGFydCBub2RlIHdoaWNoIGhhcyB0aGUgbWluaW11bSBgZmAgdmFsdWUuXG4gICAgICAgIG5vZGUgPSBzdGFydE9wZW5MaXN0LnBvcCgpO1xuICAgICAgICBub2RlLmNsb3NlZCA9IHRydWU7XG5cbiAgICAgICAgLy8gZ2V0IG5laWdib3VycyBvZiB0aGUgY3VycmVudCBub2RlXG4gICAgICAgIG5laWdoYm9ycyA9IGdyaWQuZ2V0TmVpZ2hib3JzKG5vZGUsIGFsbG93RGlhZ29uYWwsIGRvbnRDcm9zc0Nvcm5lcnMpO1xuICAgICAgICBmb3IgKGkgPSAwLCBsID0gbmVpZ2hib3JzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgbmVpZ2hib3IgPSBuZWlnaGJvcnNbaV07XG5cbiAgICAgICAgICAgIGlmIChuZWlnaGJvci5jbG9zZWQpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuZWlnaGJvci5vcGVuZWQgPT09IEJZX0VORCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBVdGlsLmJpQmFja3RyYWNlKG5vZGUsIG5laWdoYm9yKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgeCA9IG5laWdoYm9yLng7XG4gICAgICAgICAgICB5ID0gbmVpZ2hib3IueTtcblxuICAgICAgICAgICAgLy8gZ2V0IHRoZSBkaXN0YW5jZSBiZXR3ZWVuIGN1cnJlbnQgbm9kZSBhbmQgdGhlIG5laWdoYm9yXG4gICAgICAgICAgICAvLyBhbmQgY2FsY3VsYXRlIHRoZSBuZXh0IGcgc2NvcmVcbiAgICAgICAgICAgIG5nID0gbm9kZS5nICsgKCh4IC0gbm9kZS54ID09PSAwIHx8IHkgLSBub2RlLnkgPT09IDApID8gMSA6IFNRUlQyKTtcblxuICAgICAgICAgICAgLy8gY2hlY2sgaWYgdGhlIG5laWdoYm9yIGhhcyBub3QgYmVlbiBpbnNwZWN0ZWQgeWV0LCBvclxuICAgICAgICAgICAgLy8gY2FuIGJlIHJlYWNoZWQgd2l0aCBzbWFsbGVyIGNvc3QgZnJvbSB0aGUgY3VycmVudCBub2RlXG4gICAgICAgICAgICBpZiAoIW5laWdoYm9yLm9wZW5lZCB8fCBuZyA8IG5laWdoYm9yLmcpIHtcbiAgICAgICAgICAgICAgICBuZWlnaGJvci5nID0gbmc7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3IuaCA9IG5laWdoYm9yLmggfHwgd2VpZ2h0ICogaGV1cmlzdGljKGFicyh4IC0gZW5kWCksIGFicyh5IC0gZW5kWSkpO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLmYgPSBuZWlnaGJvci5nICsgbmVpZ2hib3IuaDtcbiAgICAgICAgICAgICAgICBuZWlnaGJvci5wYXJlbnQgPSBub2RlO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFuZWlnaGJvci5vcGVuZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRPcGVuTGlzdC5wdXNoKG5laWdoYm9yKTtcbiAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3Iub3BlbmVkID0gQllfU1RBUlQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIG5laWdoYm9yIGNhbiBiZSByZWFjaGVkIHdpdGggc21hbGxlciBjb3N0LlxuICAgICAgICAgICAgICAgICAgICAvLyBTaW5jZSBpdHMgZiB2YWx1ZSBoYXMgYmVlbiB1cGRhdGVkLCB3ZSBoYXZlIHRvXG4gICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBpdHMgcG9zaXRpb24gaW4gdGhlIG9wZW4gbGlzdFxuICAgICAgICAgICAgICAgICAgICBzdGFydE9wZW5MaXN0LnVwZGF0ZUl0ZW0obmVpZ2hib3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSAvLyBlbmQgZm9yIGVhY2ggbmVpZ2hib3JcblxuXG4gICAgICAgIC8vIHBvcCB0aGUgcG9zaXRpb24gb2YgZW5kIG5vZGUgd2hpY2ggaGFzIHRoZSBtaW5pbXVtIGBmYCB2YWx1ZS5cbiAgICAgICAgbm9kZSA9IGVuZE9wZW5MaXN0LnBvcCgpO1xuICAgICAgICBub2RlLmNsb3NlZCA9IHRydWU7XG5cbiAgICAgICAgLy8gZ2V0IG5laWdib3VycyBvZiB0aGUgY3VycmVudCBub2RlXG4gICAgICAgIG5laWdoYm9ycyA9IGdyaWQuZ2V0TmVpZ2hib3JzKG5vZGUsIGFsbG93RGlhZ29uYWwsIGRvbnRDcm9zc0Nvcm5lcnMpO1xuICAgICAgICBmb3IgKGkgPSAwLCBsID0gbmVpZ2hib3JzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgbmVpZ2hib3IgPSBuZWlnaGJvcnNbaV07XG5cbiAgICAgICAgICAgIGlmIChuZWlnaGJvci5jbG9zZWQpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuZWlnaGJvci5vcGVuZWQgPT09IEJZX1NUQVJUKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFV0aWwuYmlCYWNrdHJhY2UobmVpZ2hib3IsIG5vZGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB4ID0gbmVpZ2hib3IueDtcbiAgICAgICAgICAgIHkgPSBuZWlnaGJvci55O1xuXG4gICAgICAgICAgICAvLyBnZXQgdGhlIGRpc3RhbmNlIGJldHdlZW4gY3VycmVudCBub2RlIGFuZCB0aGUgbmVpZ2hib3JcbiAgICAgICAgICAgIC8vIGFuZCBjYWxjdWxhdGUgdGhlIG5leHQgZyBzY29yZVxuICAgICAgICAgICAgbmcgPSBub2RlLmcgKyAoKHggLSBub2RlLnggPT09IDAgfHwgeSAtIG5vZGUueSA9PT0gMCkgPyAxIDogU1FSVDIpO1xuXG4gICAgICAgICAgICAvLyBjaGVjayBpZiB0aGUgbmVpZ2hib3IgaGFzIG5vdCBiZWVuIGluc3BlY3RlZCB5ZXQsIG9yXG4gICAgICAgICAgICAvLyBjYW4gYmUgcmVhY2hlZCB3aXRoIHNtYWxsZXIgY29zdCBmcm9tIHRoZSBjdXJyZW50IG5vZGVcbiAgICAgICAgICAgIGlmICghbmVpZ2hib3Iub3BlbmVkIHx8IG5nIDwgbmVpZ2hib3IuZykge1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLmcgPSBuZztcbiAgICAgICAgICAgICAgICBuZWlnaGJvci5oID0gbmVpZ2hib3IuaCB8fCB3ZWlnaHQgKiBoZXVyaXN0aWMoYWJzKHggLSBzdGFydFgpLCBhYnMoeSAtIHN0YXJ0WSkpO1xuICAgICAgICAgICAgICAgIG5laWdoYm9yLmYgPSBuZWlnaGJvci5nICsgbmVpZ2hib3IuaDtcbiAgICAgICAgICAgICAgICBuZWlnaGJvci5wYXJlbnQgPSBub2RlO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFuZWlnaGJvci5vcGVuZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZW5kT3Blbkxpc3QucHVzaChuZWlnaGJvcik7XG4gICAgICAgICAgICAgICAgICAgIG5laWdoYm9yLm9wZW5lZCA9IEJZX0VORDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgbmVpZ2hib3IgY2FuIGJlIHJlYWNoZWQgd2l0aCBzbWFsbGVyIGNvc3QuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNpbmNlIGl0cyBmIHZhbHVlIGhhcyBiZWVuIHVwZGF0ZWQsIHdlIGhhdmUgdG9cbiAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlIGl0cyBwb3NpdGlvbiBpbiB0aGUgb3BlbiBsaXN0XG4gICAgICAgICAgICAgICAgICAgIGVuZE9wZW5MaXN0LnVwZGF0ZUl0ZW0obmVpZ2hib3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSAvLyBlbmQgZm9yIGVhY2ggbmVpZ2hib3JcbiAgICB9IC8vIGVuZCB3aGlsZSBub3Qgb3BlbiBsaXN0IGVtcHR5XG5cbiAgICAvLyBmYWlsIHRvIGZpbmQgdGhlIHBhdGhcbiAgICByZXR1cm4gW107XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJpQVN0YXJGaW5kZXI7XG4iLCJ2YXIgQmlBU3RhckZpbmRlciA9IHJlcXVpcmUoJy4vQmlBU3RhckZpbmRlcicpO1xuXG4vKipcbiAqIEJpLWRpcmVjaXRpb25hbCBCZXN0LUZpcnN0LVNlYXJjaCBwYXRoLWZpbmRlci5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMgQmlBU3RhckZpbmRlclxuICogQHBhcmFtIHtvYmplY3R9IG9wdFxuICogQHBhcmFtIHtib29sZWFufSBvcHQuYWxsb3dEaWFnb25hbCBXaGV0aGVyIGRpYWdvbmFsIG1vdmVtZW50IGlzIGFsbG93ZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5kb250Q3Jvc3NDb3JuZXJzIERpc2FsbG93IGRpYWdvbmFsIG1vdmVtZW50IHRvdWNoaW5nIGJsb2NrIGNvcm5lcnMuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHQuaGV1cmlzdGljIEhldXJpc3RpYyBmdW5jdGlvbiB0byBlc3RpbWF0ZSB0aGUgZGlzdGFuY2VcbiAqICAgICAoZGVmYXVsdHMgdG8gbWFuaGF0dGFuKS5cbiAqL1xuZnVuY3Rpb24gQmlCZXN0Rmlyc3RGaW5kZXIob3B0KSB7XG4gICAgQmlBU3RhckZpbmRlci5jYWxsKHRoaXMsIG9wdCk7XG5cbiAgICB2YXIgb3JpZyA9IHRoaXMuaGV1cmlzdGljO1xuICAgIHRoaXMuaGV1cmlzdGljID0gZnVuY3Rpb24oZHgsIGR5KSB7XG4gICAgICAgIHJldHVybiBvcmlnKGR4LCBkeSkgKiAxMDAwMDAwO1xuICAgIH07XG59XG5cbkJpQmVzdEZpcnN0RmluZGVyLnByb3RvdHlwZSA9IG5ldyBCaUFTdGFyRmluZGVyKCk7XG5CaUJlc3RGaXJzdEZpbmRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBCaUJlc3RGaXJzdEZpbmRlcjtcblxubW9kdWxlLmV4cG9ydHMgPSBCaUJlc3RGaXJzdEZpbmRlcjtcbiIsInZhciBVdGlsID0gcmVxdWlyZSgnLi4vY29yZS9VdGlsJyk7XG5cbi8qKlxuICogQmktZGlyZWN0aW9uYWwgQnJlYWR0aC1GaXJzdC1TZWFyY2ggcGF0aCBmaW5kZXIuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0LmFsbG93RGlhZ29uYWwgV2hldGhlciBkaWFnb25hbCBtb3ZlbWVudCBpcyBhbGxvd2VkLlxuICogQHBhcmFtIHtib29sZWFufSBvcHQuZG9udENyb3NzQ29ybmVycyBEaXNhbGxvdyBkaWFnb25hbCBtb3ZlbWVudCB0b3VjaGluZyBibG9jayBjb3JuZXJzLlxuICovXG5mdW5jdGlvbiBCaUJyZWFkdGhGaXJzdEZpbmRlcihvcHQpIHtcbiAgICBvcHQgPSBvcHQgfHwge307XG4gICAgdGhpcy5hbGxvd0RpYWdvbmFsID0gb3B0LmFsbG93RGlhZ29uYWw7XG4gICAgdGhpcy5kb250Q3Jvc3NDb3JuZXJzID0gb3B0LmRvbnRDcm9zc0Nvcm5lcnM7XG59XG5cblxuLyoqXG4gKiBGaW5kIGFuZCByZXR1cm4gdGhlIHRoZSBwYXRoLlxuICogQHJldHVybiB7QXJyYXkuPFtudW1iZXIsIG51bWJlcl0+fSBUaGUgcGF0aCwgaW5jbHVkaW5nIGJvdGggc3RhcnQgYW5kXG4gKiAgICAgZW5kIHBvc2l0aW9ucy5cbiAqL1xuQmlCcmVhZHRoRmlyc3RGaW5kZXIucHJvdG90eXBlLmZpbmRQYXRoID0gZnVuY3Rpb24oc3RhcnRYLCBzdGFydFksIGVuZFgsIGVuZFksIGdyaWQpIHtcbiAgICB2YXIgc3RhcnROb2RlID0gZ3JpZC5nZXROb2RlQXQoc3RhcnRYLCBzdGFydFkpLFxuICAgICAgICBlbmROb2RlID0gZ3JpZC5nZXROb2RlQXQoZW5kWCwgZW5kWSksXG4gICAgICAgIHN0YXJ0T3Blbkxpc3QgPSBbXSwgZW5kT3Blbkxpc3QgPSBbXSxcbiAgICAgICAgbmVpZ2hib3JzLCBuZWlnaGJvciwgbm9kZSxcbiAgICAgICAgYWxsb3dEaWFnb25hbCA9IHRoaXMuYWxsb3dEaWFnb25hbCxcbiAgICAgICAgZG9udENyb3NzQ29ybmVycyA9IHRoaXMuZG9udENyb3NzQ29ybmVycyxcbiAgICAgICAgQllfU1RBUlQgPSAwLCBCWV9FTkQgPSAxLFxuICAgICAgICBpLCBsO1xuXG4gICAgLy8gcHVzaCB0aGUgc3RhcnQgYW5kIGVuZCBub2RlcyBpbnRvIHRoZSBxdWV1ZXNcbiAgICBzdGFydE9wZW5MaXN0LnB1c2goc3RhcnROb2RlKTtcbiAgICBzdGFydE5vZGUub3BlbmVkID0gdHJ1ZTtcbiAgICBzdGFydE5vZGUuYnkgPSBCWV9TVEFSVDtcblxuICAgIGVuZE9wZW5MaXN0LnB1c2goZW5kTm9kZSk7XG4gICAgZW5kTm9kZS5vcGVuZWQgPSB0cnVlO1xuICAgIGVuZE5vZGUuYnkgPSBCWV9FTkQ7XG5cbiAgICAvLyB3aGlsZSBib3RoIHRoZSBxdWV1ZXMgYXJlIG5vdCBlbXB0eVxuICAgIHdoaWxlIChzdGFydE9wZW5MaXN0Lmxlbmd0aCAmJiBlbmRPcGVuTGlzdC5sZW5ndGgpIHtcblxuICAgICAgICAvLyBleHBhbmQgc3RhcnQgb3BlbiBsaXN0XG5cbiAgICAgICAgbm9kZSA9IHN0YXJ0T3Blbkxpc3Quc2hpZnQoKTtcbiAgICAgICAgbm9kZS5jbG9zZWQgPSB0cnVlO1xuXG4gICAgICAgIG5laWdoYm9ycyA9IGdyaWQuZ2V0TmVpZ2hib3JzKG5vZGUsIGFsbG93RGlhZ29uYWwsIGRvbnRDcm9zc0Nvcm5lcnMpO1xuICAgICAgICBmb3IgKGkgPSAwLCBsID0gbmVpZ2hib3JzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgbmVpZ2hib3IgPSBuZWlnaGJvcnNbaV07XG5cbiAgICAgICAgICAgIGlmIChuZWlnaGJvci5jbG9zZWQpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuZWlnaGJvci5vcGVuZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBpZiB0aGlzIG5vZGUgaGFzIGJlZW4gaW5zcGVjdGVkIGJ5IHRoZSByZXZlcnNlZCBzZWFyY2gsXG4gICAgICAgICAgICAgICAgLy8gdGhlbiBhIHBhdGggaXMgZm91bmQuXG4gICAgICAgICAgICAgICAgaWYgKG5laWdoYm9yLmJ5ID09PSBCWV9FTkQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFV0aWwuYmlCYWNrdHJhY2Uobm9kZSwgbmVpZ2hib3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXJ0T3Blbkxpc3QucHVzaChuZWlnaGJvcik7XG4gICAgICAgICAgICBuZWlnaGJvci5wYXJlbnQgPSBub2RlO1xuICAgICAgICAgICAgbmVpZ2hib3Iub3BlbmVkID0gdHJ1ZTtcbiAgICAgICAgICAgIG5laWdoYm9yLmJ5ID0gQllfU1RBUlQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBleHBhbmQgZW5kIG9wZW4gbGlzdFxuXG4gICAgICAgIG5vZGUgPSBlbmRPcGVuTGlzdC5zaGlmdCgpO1xuICAgICAgICBub2RlLmNsb3NlZCA9IHRydWU7XG5cbiAgICAgICAgbmVpZ2hib3JzID0gZ3JpZC5nZXROZWlnaGJvcnMobm9kZSwgYWxsb3dEaWFnb25hbCwgZG9udENyb3NzQ29ybmVycyk7XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBuZWlnaGJvcnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBuZWlnaGJvciA9IG5laWdoYm9yc1tpXTtcblxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLmNsb3NlZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLm9wZW5lZCkge1xuICAgICAgICAgICAgICAgIGlmIChuZWlnaGJvci5ieSA9PT0gQllfU1RBUlQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFV0aWwuYmlCYWNrdHJhY2UobmVpZ2hib3IsIG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVuZE9wZW5MaXN0LnB1c2gobmVpZ2hib3IpO1xuICAgICAgICAgICAgbmVpZ2hib3IucGFyZW50ID0gbm9kZTtcbiAgICAgICAgICAgIG5laWdoYm9yLm9wZW5lZCA9IHRydWU7XG4gICAgICAgICAgICBuZWlnaGJvci5ieSA9IEJZX0VORDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGZhaWwgdG8gZmluZCB0aGUgcGF0aFxuICAgIHJldHVybiBbXTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQmlCcmVhZHRoRmlyc3RGaW5kZXI7XG4iLCJ2YXIgQmlBU3RhckZpbmRlciA9IHJlcXVpcmUoJy4vQmlBU3RhckZpbmRlcicpO1xuXG4vKipcbiAqIEJpLWRpcmVjdGlvbmFsIERpamtzdHJhIHBhdGgtZmluZGVyLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyBCaUFTdGFyRmluZGVyXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0XG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5hbGxvd0RpYWdvbmFsIFdoZXRoZXIgZGlhZ29uYWwgbW92ZW1lbnQgaXMgYWxsb3dlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0LmRvbnRDcm9zc0Nvcm5lcnMgRGlzYWxsb3cgZGlhZ29uYWwgbW92ZW1lbnQgdG91Y2hpbmcgYmxvY2sgY29ybmVycy5cbiAqL1xuZnVuY3Rpb24gQmlEaWprc3RyYUZpbmRlcihvcHQpIHtcbiAgICBCaUFTdGFyRmluZGVyLmNhbGwodGhpcywgb3B0KTtcbiAgICB0aGlzLmhldXJpc3RpYyA9IGZ1bmN0aW9uKGR4LCBkeSkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9O1xufVxuXG5CaURpamtzdHJhRmluZGVyLnByb3RvdHlwZSA9IG5ldyBCaUFTdGFyRmluZGVyKCk7XG5CaURpamtzdHJhRmluZGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEJpRGlqa3N0cmFGaW5kZXI7XG5cbm1vZHVsZS5leHBvcnRzID0gQmlEaWprc3RyYUZpbmRlcjtcbiIsInZhciBVdGlsID0gcmVxdWlyZSgnLi4vY29yZS9VdGlsJyk7XG5cbi8qKlxuICogQnJlYWR0aC1GaXJzdC1TZWFyY2ggcGF0aCBmaW5kZXIuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0LmFsbG93RGlhZ29uYWwgV2hldGhlciBkaWFnb25hbCBtb3ZlbWVudCBpcyBhbGxvd2VkLlxuICogQHBhcmFtIHtib29sZWFufSBvcHQuZG9udENyb3NzQ29ybmVycyBEaXNhbGxvdyBkaWFnb25hbCBtb3ZlbWVudCB0b3VjaGluZyBibG9jayBjb3JuZXJzLlxuICovXG5mdW5jdGlvbiBCcmVhZHRoRmlyc3RGaW5kZXIob3B0KSB7XG4gICAgb3B0ID0gb3B0IHx8IHt9O1xuICAgIHRoaXMuYWxsb3dEaWFnb25hbCA9IG9wdC5hbGxvd0RpYWdvbmFsO1xuICAgIHRoaXMuZG9udENyb3NzQ29ybmVycyA9IG9wdC5kb250Q3Jvc3NDb3JuZXJzO1xufVxuXG4vKipcbiAqIEZpbmQgYW5kIHJldHVybiB0aGUgdGhlIHBhdGguXG4gKiBAcmV0dXJuIHtBcnJheS48W251bWJlciwgbnVtYmVyXT59IFRoZSBwYXRoLCBpbmNsdWRpbmcgYm90aCBzdGFydCBhbmRcbiAqICAgICBlbmQgcG9zaXRpb25zLlxuICovXG5CcmVhZHRoRmlyc3RGaW5kZXIucHJvdG90eXBlLmZpbmRQYXRoID0gZnVuY3Rpb24oc3RhcnRYLCBzdGFydFksIGVuZFgsIGVuZFksIGdyaWQpIHtcbiAgICB2YXIgb3Blbkxpc3QgPSBbXSxcbiAgICAgICAgYWxsb3dEaWFnb25hbCA9IHRoaXMuYWxsb3dEaWFnb25hbCxcbiAgICAgICAgZG9udENyb3NzQ29ybmVycyA9IHRoaXMuZG9udENyb3NzQ29ybmVycyxcbiAgICAgICAgc3RhcnROb2RlID0gZ3JpZC5nZXROb2RlQXQoc3RhcnRYLCBzdGFydFkpLFxuICAgICAgICBlbmROb2RlID0gZ3JpZC5nZXROb2RlQXQoZW5kWCwgZW5kWSksXG4gICAgICAgIG5laWdoYm9ycywgbmVpZ2hib3IsIG5vZGUsIGksIGw7XG5cbiAgICAvLyBwdXNoIHRoZSBzdGFydCBwb3MgaW50byB0aGUgcXVldWVcbiAgICBvcGVuTGlzdC5wdXNoKHN0YXJ0Tm9kZSk7XG4gICAgc3RhcnROb2RlLm9wZW5lZCA9IHRydWU7XG5cbiAgICAvLyB3aGlsZSB0aGUgcXVldWUgaXMgbm90IGVtcHR5XG4gICAgd2hpbGUgKG9wZW5MaXN0Lmxlbmd0aCkge1xuICAgICAgICAvLyB0YWtlIHRoZSBmcm9udCBub2RlIGZyb20gdGhlIHF1ZXVlXG4gICAgICAgIG5vZGUgPSBvcGVuTGlzdC5zaGlmdCgpO1xuICAgICAgICBub2RlLmNsb3NlZCA9IHRydWU7XG5cbiAgICAgICAgLy8gcmVhY2hlZCB0aGUgZW5kIHBvc2l0aW9uXG4gICAgICAgIGlmIChub2RlID09PSBlbmROb2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gVXRpbC5iYWNrdHJhY2UoZW5kTm9kZSk7XG4gICAgICAgIH1cblxuICAgICAgICBuZWlnaGJvcnMgPSBncmlkLmdldE5laWdoYm9ycyhub2RlLCBhbGxvd0RpYWdvbmFsLCBkb250Q3Jvc3NDb3JuZXJzKTtcbiAgICAgICAgZm9yIChpID0gMCwgbCA9IG5laWdoYm9ycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgIG5laWdoYm9yID0gbmVpZ2hib3JzW2ldO1xuXG4gICAgICAgICAgICAvLyBza2lwIHRoaXMgbmVpZ2hib3IgaWYgaXQgaGFzIGJlZW4gaW5zcGVjdGVkIGJlZm9yZVxuICAgICAgICAgICAgaWYgKG5laWdoYm9yLmNsb3NlZCB8fCBuZWlnaGJvci5vcGVuZWQpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb3Blbkxpc3QucHVzaChuZWlnaGJvcik7XG4gICAgICAgICAgICBuZWlnaGJvci5vcGVuZWQgPSB0cnVlO1xuICAgICAgICAgICAgbmVpZ2hib3IucGFyZW50ID0gbm9kZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyBmYWlsIHRvIGZpbmQgdGhlIHBhdGhcbiAgICByZXR1cm4gW107XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJyZWFkdGhGaXJzdEZpbmRlcjtcbiIsInZhciBBU3RhckZpbmRlciA9IHJlcXVpcmUoJy4vQVN0YXJGaW5kZXInKTtcblxuLyoqXG4gKiBEaWprc3RyYSBwYXRoLWZpbmRlci5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMgQVN0YXJGaW5kZXJcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0LmFsbG93RGlhZ29uYWwgV2hldGhlciBkaWFnb25hbCBtb3ZlbWVudCBpcyBhbGxvd2VkLlxuICogQHBhcmFtIHtib29sZWFufSBvcHQuZG9udENyb3NzQ29ybmVycyBEaXNhbGxvdyBkaWFnb25hbCBtb3ZlbWVudCB0b3VjaGluZyBibG9jayBjb3JuZXJzLlxuICovXG5mdW5jdGlvbiBEaWprc3RyYUZpbmRlcihvcHQpIHtcbiAgICBBU3RhckZpbmRlci5jYWxsKHRoaXMsIG9wdCk7XG4gICAgdGhpcy5oZXVyaXN0aWMgPSBmdW5jdGlvbihkeCwgZHkpIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfTtcbn1cblxuRGlqa3N0cmFGaW5kZXIucHJvdG90eXBlID0gbmV3IEFTdGFyRmluZGVyKCk7XG5EaWprc3RyYUZpbmRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBEaWprc3RyYUZpbmRlcjtcblxubW9kdWxlLmV4cG9ydHMgPSBEaWprc3RyYUZpbmRlcjtcbiIsInZhciBVdGlsICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9VdGlsJyk7XG52YXIgSGV1cmlzdGljICA9IHJlcXVpcmUoJy4uL2NvcmUvSGV1cmlzdGljJyk7XG52YXIgTm9kZSAgICAgICA9IHJlcXVpcmUoJy4uL2NvcmUvTm9kZScpO1xuXG4vKipcbiAqIEl0ZXJhdGl2ZSBEZWVwaW5nIEEgU3RhciAoSURBKikgcGF0aC1maW5kZXIuXG4gKlxuICogUmVjdXJzaW9uIGJhc2VkIG9uOlxuICogICBodHRwOi8vd3d3LmFwbC5qaHUuZWR1L35oYWxsL0FJLVByb2dyYW1taW5nL0lEQS1TdGFyLmh0bWxcbiAqXG4gKiBQYXRoIHJldHJhY2luZyBiYXNlZCBvbjpcbiAqICBWLiBOYWdlc2h3YXJhIFJhbywgVmlwaW4gS3VtYXIgYW5kIEsuIFJhbWVzaFxuICogIFwiQSBQYXJhbGxlbCBJbXBsZW1lbnRhdGlvbiBvZiBJdGVyYXRpdmUtRGVlcGluZy1BKlwiLCBKYW51YXJ5IDE5ODcuXG4gKiAgZnRwOi8vZnRwLmNzLnV0ZXhhcy5lZHUvLnNuYXBzaG90L2hvdXJseS4xL3B1Yi9BSS1MYWIvdGVjaC1yZXBvcnRzL1VULUFJLVRSLTg3LTQ2LnBkZlxuICpcbiAqIEBhdXRob3IgR2VyYXJkIE1laWVyICh3d3cuZ2VyYXJkbWVpZXIuY29tKVxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtvYmplY3R9IG9wdFxuICogQHBhcmFtIHtib29sZWFufSBvcHQuYWxsb3dEaWFnb25hbCBXaGV0aGVyIGRpYWdvbmFsIG1vdmVtZW50IGlzIGFsbG93ZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdC5kb250Q3Jvc3NDb3JuZXJzIERpc2FsbG93IGRpYWdvbmFsIG1vdmVtZW50IHRvdWNoaW5nIGJsb2NrIGNvcm5lcnMuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHQuaGV1cmlzdGljIEhldXJpc3RpYyBmdW5jdGlvbiB0byBlc3RpbWF0ZSB0aGUgZGlzdGFuY2VcbiAqICAgICAoZGVmYXVsdHMgdG8gbWFuaGF0dGFuKS5cbiAqIEBwYXJhbSB7aW50ZWdlcn0gb3B0LndlaWdodCBXZWlnaHQgdG8gYXBwbHkgdG8gdGhlIGhldXJpc3RpYyB0byBhbGxvdyBmb3Igc3Vib3B0aW1hbCBwYXRocyxcbiAqICAgICBpbiBvcmRlciB0byBzcGVlZCB1cCB0aGUgc2VhcmNoLlxuICogQHBhcmFtIHtvYmplY3R9IG9wdC50cmFja1JlY3Vyc2lvbiBXaGV0aGVyIHRvIHRyYWNrIHJlY3Vyc2lvbiBmb3Igc3RhdGlzdGljYWwgcHVycG9zZXMuXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0LnRpbWVMaW1pdCBNYXhpbXVtIGV4ZWN1dGlvbiB0aW1lLiBVc2UgPD0gMCBmb3IgaW5maW5pdGUuXG4gKi9cblxuZnVuY3Rpb24gSURBU3RhckZpbmRlcihvcHQpIHtcbiAgICBvcHQgPSBvcHQgfHwge307XG4gICAgdGhpcy5hbGxvd0RpYWdvbmFsID0gb3B0LmFsbG93RGlhZ29uYWw7XG4gICAgdGhpcy5kb250Q3Jvc3NDb3JuZXJzID0gb3B0LmRvbnRDcm9zc0Nvcm5lcnM7XG4gICAgdGhpcy5oZXVyaXN0aWMgPSBvcHQuaGV1cmlzdGljIHx8IEhldXJpc3RpYy5tYW5oYXR0YW47XG4gICAgdGhpcy53ZWlnaHQgPSBvcHQud2VpZ2h0IHx8IDE7XG4gICAgdGhpcy50cmFja1JlY3Vyc2lvbiA9IG9wdC50cmFja1JlY3Vyc2lvbiB8fCBmYWxzZTtcbiAgICB0aGlzLnRpbWVMaW1pdCA9IG9wdC50aW1lTGltaXQgfHwgSW5maW5pdHk7IC8vIERlZmF1bHQ6IG5vIHRpbWUgbGltaXQuXG59XG5cbi8qKlxuICogRmluZCBhbmQgcmV0dXJuIHRoZSB0aGUgcGF0aC4gV2hlbiBhbiBlbXB0eSBhcnJheSBpcyByZXR1cm5lZCwgZWl0aGVyXG4gKiBubyBwYXRoIGlzIHBvc3NpYmxlLCBvciB0aGUgbWF4aW11bSBleGVjdXRpb24gdGltZSBpcyByZWFjaGVkLlxuICpcbiAqIEByZXR1cm4ge0FycmF5LjxbbnVtYmVyLCBudW1iZXJdPn0gVGhlIHBhdGgsIGluY2x1ZGluZyBib3RoIHN0YXJ0IGFuZFxuICogICAgIGVuZCBwb3NpdGlvbnMuXG4gKi9cbklEQVN0YXJGaW5kZXIucHJvdG90eXBlLmZpbmRQYXRoID0gZnVuY3Rpb24oc3RhcnRYLCBzdGFydFksIGVuZFgsIGVuZFksIGdyaWQpIHtcbiAgICAvLyBVc2VkIGZvciBzdGF0aXN0aWNzOlxuICAgIHZhciBub2Rlc1Zpc2l0ZWQgPSAwO1xuXG4gICAgLy8gRXhlY3V0aW9uIHRpbWUgbGltaXRhdGlvbjpcbiAgICB2YXIgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgICAvLyBIZXVyaXN0aWMgaGVscGVyOlxuICAgIHZhciBoID0gZnVuY3Rpb24oYSwgYikge1xuICAgICAgICByZXR1cm4gdGhpcy5oZXVyaXN0aWMoTWF0aC5hYnMoYi54IC0gYS54KSwgTWF0aC5hYnMoYi55IC0gYS55KSk7XG4gICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgLy8gU3RlcCBjb3N0IGZyb20gYSB0byBiOlxuICAgIHZhciBjb3N0ID0gZnVuY3Rpb24oYSwgYikge1xuICAgICAgICByZXR1cm4gKGEueCA9PT0gYi54IHx8IGEueSA9PT0gYi55KSA/IDEgOiBNYXRoLlNRUlQyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJREEqIHNlYXJjaCBpbXBsZW1lbnRhdGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Tm9kZX0gVGhlIG5vZGUgY3VycmVudGx5IGV4cGFuZGluZyBmcm9tLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBDb3N0IHRvIHJlYWNoIHRoZSBnaXZlbiBub2RlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBNYXhpbXVtIHNlYXJjaCBkZXB0aCAoY3V0LW9mZiB2YWx1ZSkuXG4gICAgICogQHBhcmFtIHt7QXJyYXkuPFtudW1iZXIsIG51bWJlcl0+fX0gVGhlIGZvdW5kIHJvdXRlLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBSZWN1cnNpb24gZGVwdGguXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IGVpdGhlciBhIG51bWJlciB3aXRoIHRoZSBuZXcgb3B0aW1hbCBjdXQtb2ZmIGRlcHRoLFxuICAgICAqIG9yIGEgdmFsaWQgbm9kZSBpbnN0YW5jZSwgaW4gd2hpY2ggY2FzZSBhIHBhdGggd2FzIGZvdW5kLlxuICAgICAqL1xuICAgIHZhciBzZWFyY2ggPSBmdW5jdGlvbihub2RlLCBnLCBjdXRvZmYsIHJvdXRlLCBkZXB0aCkge1xuICAgICAgICBub2Rlc1Zpc2l0ZWQrKztcblxuICAgICAgICAvLyBFbmZvcmNlIHRpbWVsaW1pdDpcbiAgICAgICAgaWYodGhpcy50aW1lTGltaXQgPiAwICYmIG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRUaW1lID4gdGhpcy50aW1lTGltaXQgKiAxMDAwKSB7XG4gICAgICAgICAgICAvLyBFbmZvcmNlZCBhcyBcInBhdGgtbm90LWZvdW5kXCIuXG4gICAgICAgICAgICByZXR1cm4gSW5maW5pdHk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZiA9IGcgKyBoKG5vZGUsIGVuZCkgKiB0aGlzLndlaWdodDtcblxuICAgICAgICAvLyBXZSd2ZSBzZWFyY2hlZCB0b28gZGVlcCBmb3IgdGhpcyBpdGVyYXRpb24uXG4gICAgICAgIGlmKGYgPiBjdXRvZmYpIHtcbiAgICAgICAgICAgIHJldHVybiBmO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYobm9kZSA9PSBlbmQpIHtcbiAgICAgICAgICAgIHJvdXRlW2RlcHRoXSA9IFtub2RlLngsIG5vZGUueV07XG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBtaW4sIHQsIGssIG5laWdoYm91cjtcblxuICAgICAgICB2YXIgbmVpZ2hib3VycyA9IGdyaWQuZ2V0TmVpZ2hib3JzKG5vZGUsIHRoaXMuYWxsb3dEaWFnb25hbCwgdGhpcy5kb250Q3Jvc3NDb3JuZXJzKTtcblxuICAgICAgICAvLyBTb3J0IHRoZSBuZWlnaGJvdXJzLCBnaXZlcyBuaWNlciBwYXRocy4gQnV0LCB0aGlzIGRldmlhdGVzXG4gICAgICAgIC8vIGZyb20gdGhlIG9yaWdpbmFsIGFsZ29yaXRobSAtIHNvIEkgbGVmdCBpdCBvdXQuXG4gICAgICAgIC8vbmVpZ2hib3Vycy5zb3J0KGZ1bmN0aW9uKGEsIGIpe1xuICAgICAgICAvLyAgICByZXR1cm4gaChhLCBlbmQpIC0gaChiLCBlbmQpO1xuICAgICAgICAvL30pO1xuXG4gICAgICAgIGZvcihrID0gMCwgbWluID0gSW5maW5pdHk7IG5laWdoYm91ciA9IG5laWdoYm91cnNba107ICsraykge1xuXG4gICAgICAgICAgICBpZih0aGlzLnRyYWNrUmVjdXJzaW9uKSB7XG4gICAgICAgICAgICAgICAgLy8gUmV0YWluIGEgY29weSBmb3IgdmlzdWFsaXNhdGlvbi4gRHVlIHRvIHJlY3Vyc2lvbiwgdGhpc1xuICAgICAgICAgICAgICAgIC8vIG5vZGUgbWF5IGJlIHBhcnQgb2Ygb3RoZXIgcGF0aHMgdG9vLlxuICAgICAgICAgICAgICAgIG5laWdoYm91ci5yZXRhaW5Db3VudCA9IG5laWdoYm91ci5yZXRhaW5Db3VudCArIDEgfHwgMTtcblxuICAgICAgICAgICAgICAgIGlmKG5laWdoYm91ci50ZXN0ZWQgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3VyLnRlc3RlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0ID0gc2VhcmNoKG5laWdoYm91ciwgZyArIGNvc3Qobm9kZSwgbmVpZ2hib3VyKSwgY3V0b2ZmLCByb3V0ZSwgZGVwdGggKyAxKTtcblxuICAgICAgICAgICAgaWYodCBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICAgICAgICAgICAgICByb3V0ZVtkZXB0aF0gPSBbbm9kZS54LCBub2RlLnldO1xuXG4gICAgICAgICAgICAgICAgLy8gRm9yIGEgdHlwaWNhbCBBKiBsaW5rZWQgbGlzdCwgdGhpcyB3b3VsZCB3b3JrOlxuICAgICAgICAgICAgICAgIC8vIG5laWdoYm91ci5wYXJlbnQgPSBub2RlO1xuICAgICAgICAgICAgICAgIHJldHVybiB0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEZWNyZW1lbnQgY291bnQsIHRoZW4gZGV0ZXJtaW5lIHdoZXRoZXIgaXQncyBhY3R1YWxseSBjbG9zZWQuXG4gICAgICAgICAgICBpZih0aGlzLnRyYWNrUmVjdXJzaW9uICYmICgtLW5laWdoYm91ci5yZXRhaW5Db3VudCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICBuZWlnaGJvdXIudGVzdGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKHQgPCBtaW4pIHtcbiAgICAgICAgICAgICAgICBtaW4gPSB0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1pbjtcblxuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIC8vIE5vZGUgaW5zdGFuY2UgbG9va3VwczpcbiAgICB2YXIgc3RhcnQgPSBncmlkLmdldE5vZGVBdChzdGFydFgsIHN0YXJ0WSk7XG4gICAgdmFyIGVuZCAgID0gZ3JpZC5nZXROb2RlQXQoZW5kWCwgZW5kWSk7XG5cbiAgICAvLyBJbml0aWFsIHNlYXJjaCBkZXB0aCwgZ2l2ZW4gdGhlIHR5cGljYWwgaGV1cmlzdGljIGNvbnRyYWludHMsXG4gICAgLy8gdGhlcmUgc2hvdWxkIGJlIG5vIGNoZWFwZXIgcm91dGUgcG9zc2libGUuXG4gICAgdmFyIGN1dE9mZiA9IGgoc3RhcnQsIGVuZCk7XG5cbiAgICB2YXIgaiwgcm91dGUsIHQ7XG5cbiAgICAvLyBXaXRoIGFuIG92ZXJmbG93IHByb3RlY3Rpb24uXG4gICAgZm9yKGogPSAwOyB0cnVlOyArK2opIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIkl0ZXJhdGlvbjogXCIgKyBqICsgXCIsIHNlYXJjaCBjdXQtb2ZmIHZhbHVlOiBcIiArIGN1dE9mZiArIFwiLCBub2RlcyB2aXNpdGVkIHRodXMgZmFyOiBcIiArIG5vZGVzVmlzaXRlZCArIFwiLlwiKTtcblxuICAgICAgICByb3V0ZSA9IFtdO1xuXG4gICAgICAgIC8vIFNlYXJjaCB0aWxsIGN1dC1vZmYgZGVwdGg6XG4gICAgICAgIHQgPSBzZWFyY2goc3RhcnQsIDAsIGN1dE9mZiwgcm91dGUsIDApO1xuXG4gICAgICAgIC8vIFJvdXRlIG5vdCBwb3NzaWJsZSwgb3Igbm90IGZvdW5kIGluIHRpbWUgbGltaXQuXG4gICAgICAgIGlmKHQgPT09IEluZmluaXR5KSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB0IGlzIGEgbm9kZSwgaXQncyBhbHNvIHRoZSBlbmQgbm9kZS4gUm91dGUgaXMgbm93XG4gICAgICAgIC8vIHBvcHVsYXRlZCB3aXRoIGEgdmFsaWQgcGF0aCB0byB0aGUgZW5kIG5vZGUuXG4gICAgICAgIGlmKHQgaW5zdGFuY2VvZiBOb2RlKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiRmluaXNoZWQgYXQgaXRlcmF0aW9uOiBcIiArIGogKyBcIiwgc2VhcmNoIGN1dC1vZmYgdmFsdWU6IFwiICsgY3V0T2ZmICsgXCIsIG5vZGVzIHZpc2l0ZWQ6IFwiICsgbm9kZXNWaXNpdGVkICsgXCIuXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHJvdXRlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJ5IGFnYWluLCB0aGlzIHRpbWUgd2l0aCBhIGRlZXBlciBjdXQtb2ZmLiBUaGUgdCBzY29yZVxuICAgICAgICAvLyBpcyB0aGUgY2xvc2VzdCB3ZSBnb3QgdG8gdGhlIGVuZCBub2RlLlxuICAgICAgICBjdXRPZmYgPSB0O1xuICAgIH1cblxuICAgIC8vIFRoaXMgX3Nob3VsZF8gbmV2ZXIgdG8gYmUgcmVhY2hlZC5cbiAgICByZXR1cm4gW107XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IElEQVN0YXJGaW5kZXI7XG4iLCIvKipcbiAqIEBhdXRob3IgYW5pZXJvIC8gaHR0cHM6Ly9naXRodWIuY29tL2FuaWVyb1xuICovXG52YXIgSGVhcCAgICAgICA9IHJlcXVpcmUoJ2hlYXAnKTtcbnZhciBVdGlsICAgICAgID0gcmVxdWlyZSgnLi4vY29yZS9VdGlsJyk7XG52YXIgSGV1cmlzdGljICA9IHJlcXVpcmUoJy4uL2NvcmUvSGV1cmlzdGljJyk7XG5cbi8qKlxuICogUGF0aCBmaW5kZXIgdXNpbmcgdGhlIEp1bXAgUG9pbnQgU2VhcmNoIGFsZ29yaXRobVxuICogQHBhcmFtIHtvYmplY3R9IG9wdFxuICogQHBhcmFtIHtmdW5jdGlvbn0gb3B0LmhldXJpc3RpYyBIZXVyaXN0aWMgZnVuY3Rpb24gdG8gZXN0aW1hdGUgdGhlIGRpc3RhbmNlXG4gKiAgICAgKGRlZmF1bHRzIHRvIG1hbmhhdHRhbikuXG4gKi9cbmZ1bmN0aW9uIEp1bXBQb2ludEZpbmRlcihvcHQpIHtcbiAgICBvcHQgPSBvcHQgfHwge307XG4gICAgdGhpcy5oZXVyaXN0aWMgPSBvcHQuaGV1cmlzdGljIHx8IEhldXJpc3RpYy5tYW5oYXR0YW47XG4gICAgdGhpcy50cmFja0p1bXBSZWN1cnNpb24gPSBvcHQudHJhY2tKdW1wUmVjdXJzaW9uIHx8IGZhbHNlO1xufVxuXG4vKipcbiAqIEZpbmQgYW5kIHJldHVybiB0aGUgcGF0aC5cbiAqIEByZXR1cm4ge0FycmF5LjxbbnVtYmVyLCBudW1iZXJdPn0gVGhlIHBhdGgsIGluY2x1ZGluZyBib3RoIHN0YXJ0IGFuZFxuICogICAgIGVuZCBwb3NpdGlvbnMuXG4gKi9cbkp1bXBQb2ludEZpbmRlci5wcm90b3R5cGUuZmluZFBhdGggPSBmdW5jdGlvbihzdGFydFgsIHN0YXJ0WSwgZW5kWCwgZW5kWSwgZ3JpZCkge1xuICAgIHZhciBvcGVuTGlzdCA9IHRoaXMub3Blbkxpc3QgPSBuZXcgSGVhcChmdW5jdGlvbihub2RlQSwgbm9kZUIpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlQS5mIC0gbm9kZUIuZjtcbiAgICAgICAgfSksXG4gICAgICAgIHN0YXJ0Tm9kZSA9IHRoaXMuc3RhcnROb2RlID0gZ3JpZC5nZXROb2RlQXQoc3RhcnRYLCBzdGFydFkpLFxuICAgICAgICBlbmROb2RlID0gdGhpcy5lbmROb2RlID0gZ3JpZC5nZXROb2RlQXQoZW5kWCwgZW5kWSksIG5vZGU7XG5cbiAgICB0aGlzLmdyaWQgPSBncmlkO1xuXG5cbiAgICAvLyBzZXQgdGhlIGBnYCBhbmQgYGZgIHZhbHVlIG9mIHRoZSBzdGFydCBub2RlIHRvIGJlIDBcbiAgICBzdGFydE5vZGUuZyA9IDA7XG4gICAgc3RhcnROb2RlLmYgPSAwO1xuXG4gICAgLy8gcHVzaCB0aGUgc3RhcnQgbm9kZSBpbnRvIHRoZSBvcGVuIGxpc3RcbiAgICBvcGVuTGlzdC5wdXNoKHN0YXJ0Tm9kZSk7XG4gICAgc3RhcnROb2RlLm9wZW5lZCA9IHRydWU7XG5cbiAgICAvLyB3aGlsZSB0aGUgb3BlbiBsaXN0IGlzIG5vdCBlbXB0eVxuICAgIHdoaWxlICghb3Blbkxpc3QuZW1wdHkoKSkge1xuICAgICAgICAvLyBwb3AgdGhlIHBvc2l0aW9uIG9mIG5vZGUgd2hpY2ggaGFzIHRoZSBtaW5pbXVtIGBmYCB2YWx1ZS5cbiAgICAgICAgbm9kZSA9IG9wZW5MaXN0LnBvcCgpO1xuICAgICAgICBub2RlLmNsb3NlZCA9IHRydWU7XG5cbiAgICAgICAgaWYgKG5vZGUgPT09IGVuZE5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBVdGlsLmV4cGFuZFBhdGgoVXRpbC5iYWNrdHJhY2UoZW5kTm9kZSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5faWRlbnRpZnlTdWNjZXNzb3JzKG5vZGUpO1xuICAgIH1cblxuICAgIC8vIGZhaWwgdG8gZmluZCB0aGUgcGF0aFxuICAgIHJldHVybiBbXTtcbn07XG5cbi8qKlxuICogSWRlbnRpZnkgc3VjY2Vzc29ycyBmb3IgdGhlIGdpdmVuIG5vZGUuIFJ1bnMgYSBqdW1wIHBvaW50IHNlYXJjaCBpbiB0aGVcbiAqIGRpcmVjdGlvbiBvZiBlYWNoIGF2YWlsYWJsZSBuZWlnaGJvciwgYWRkaW5nIGFueSBwb2ludHMgZm91bmQgdG8gdGhlIG9wZW5cbiAqIGxpc3QuXG4gKiBAcHJvdGVjdGVkXG4gKi9cbkp1bXBQb2ludEZpbmRlci5wcm90b3R5cGUuX2lkZW50aWZ5U3VjY2Vzc29ycyA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgZ3JpZCA9IHRoaXMuZ3JpZCxcbiAgICAgICAgaGV1cmlzdGljID0gdGhpcy5oZXVyaXN0aWMsXG4gICAgICAgIG9wZW5MaXN0ID0gdGhpcy5vcGVuTGlzdCxcbiAgICAgICAgZW5kWCA9IHRoaXMuZW5kTm9kZS54LFxuICAgICAgICBlbmRZID0gdGhpcy5lbmROb2RlLnksXG4gICAgICAgIG5laWdoYm9ycywgbmVpZ2hib3IsXG4gICAgICAgIGp1bXBQb2ludCwgaSwgbCxcbiAgICAgICAgeCA9IG5vZGUueCwgeSA9IG5vZGUueSxcbiAgICAgICAgangsIGp5LCBkeCwgZHksIGQsIG5nLCBqdW1wTm9kZSxcbiAgICAgICAgYWJzID0gTWF0aC5hYnMsIG1heCA9IE1hdGgubWF4O1xuXG4gICAgbmVpZ2hib3JzID0gdGhpcy5fZmluZE5laWdoYm9ycyhub2RlKTtcbiAgICBmb3IoaSA9IDAsIGwgPSBuZWlnaGJvcnMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgIG5laWdoYm9yID0gbmVpZ2hib3JzW2ldO1xuICAgICAgICBqdW1wUG9pbnQgPSB0aGlzLl9qdW1wKG5laWdoYm9yWzBdLCBuZWlnaGJvclsxXSwgeCwgeSk7XG4gICAgICAgIGlmIChqdW1wUG9pbnQpIHtcblxuICAgICAgICAgICAganggPSBqdW1wUG9pbnRbMF07XG4gICAgICAgICAgICBqeSA9IGp1bXBQb2ludFsxXTtcbiAgICAgICAgICAgIGp1bXBOb2RlID0gZ3JpZC5nZXROb2RlQXQoangsIGp5KTtcblxuICAgICAgICAgICAgaWYgKGp1bXBOb2RlLmNsb3NlZCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpbmNsdWRlIGRpc3RhbmNlLCBhcyBwYXJlbnQgbWF5IG5vdCBiZSBpbW1lZGlhdGVseSBhZGphY2VudDpcbiAgICAgICAgICAgIGQgPSBIZXVyaXN0aWMuZXVjbGlkZWFuKGFicyhqeCAtIHgpLCBhYnMoankgLSB5KSk7XG4gICAgICAgICAgICBuZyA9IG5vZGUuZyArIGQ7IC8vIG5leHQgYGdgIHZhbHVlXG5cbiAgICAgICAgICAgIGlmICghanVtcE5vZGUub3BlbmVkIHx8IG5nIDwganVtcE5vZGUuZykge1xuICAgICAgICAgICAgICAgIGp1bXBOb2RlLmcgPSBuZztcbiAgICAgICAgICAgICAgICBqdW1wTm9kZS5oID0ganVtcE5vZGUuaCB8fCBoZXVyaXN0aWMoYWJzKGp4IC0gZW5kWCksIGFicyhqeSAtIGVuZFkpKTtcbiAgICAgICAgICAgICAgICBqdW1wTm9kZS5mID0ganVtcE5vZGUuZyArIGp1bXBOb2RlLmg7XG4gICAgICAgICAgICAgICAganVtcE5vZGUucGFyZW50ID0gbm9kZTtcblxuICAgICAgICAgICAgICAgIGlmICghanVtcE5vZGUub3BlbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wZW5MaXN0LnB1c2goanVtcE5vZGUpO1xuICAgICAgICAgICAgICAgICAgICBqdW1wTm9kZS5vcGVuZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9wZW5MaXN0LnVwZGF0ZUl0ZW0oanVtcE5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICogU2VhcmNoIHJlY3Vyc2l2ZWx5IGluIHRoZSBkaXJlY3Rpb24gKHBhcmVudCAtPiBjaGlsZCksIHN0b3BwaW5nIG9ubHkgd2hlbiBhXG4gKiBqdW1wIHBvaW50IGlzIGZvdW5kLlxuICogQHByb3RlY3RlZFxuICogQHJldHVybiB7QXJyYXkuPFtudW1iZXIsIG51bWJlcl0+fSBUaGUgeCwgeSBjb29yZGluYXRlIG9mIHRoZSBqdW1wIHBvaW50XG4gKiAgICAgZm91bmQsIG9yIG51bGwgaWYgbm90IGZvdW5kXG4gKi9cbkp1bXBQb2ludEZpbmRlci5wcm90b3R5cGUuX2p1bXAgPSBmdW5jdGlvbih4LCB5LCBweCwgcHkpIHtcbiAgICB2YXIgZ3JpZCA9IHRoaXMuZ3JpZCxcbiAgICAgICAgZHggPSB4IC0gcHgsIGR5ID0geSAtIHB5LCBqeCwgank7XG5cbiAgICBpZiAoIWdyaWQuaXNXYWxrYWJsZUF0KHgsIHkpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBcbiAgICBpZih0aGlzLnRyYWNrSnVtcFJlY3Vyc2lvbiA9PT0gdHJ1ZSkge1xuICAgICAgICBncmlkLmdldE5vZGVBdCh4LCB5KS50ZXN0ZWQgPSB0cnVlO1xuICAgIH1cbiAgICBcbiAgICBpZiAoZ3JpZC5nZXROb2RlQXQoeCwgeSkgPT09IHRoaXMuZW5kTm9kZSkge1xuICAgICAgICByZXR1cm4gW3gsIHldO1xuICAgIH1cblxuICAgIC8vIGNoZWNrIGZvciBmb3JjZWQgbmVpZ2hib3JzXG4gICAgLy8gYWxvbmcgdGhlIGRpYWdvbmFsXG4gICAgaWYgKGR4ICE9PSAwICYmIGR5ICE9PSAwKSB7XG4gICAgICAgIGlmICgoZ3JpZC5pc1dhbGthYmxlQXQoeCAtIGR4LCB5ICsgZHkpICYmICFncmlkLmlzV2Fsa2FibGVBdCh4IC0gZHgsIHkpKSB8fFxuICAgICAgICAgICAgKGdyaWQuaXNXYWxrYWJsZUF0KHggKyBkeCwgeSAtIGR5KSAmJiAhZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSAtIGR5KSkpIHtcbiAgICAgICAgICAgIHJldHVybiBbeCwgeV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gaG9yaXpvbnRhbGx5L3ZlcnRpY2FsbHlcbiAgICBlbHNlIHtcbiAgICAgICAgaWYoIGR4ICE9PSAwICkgeyAvLyBtb3ZpbmcgYWxvbmcgeFxuICAgICAgICAgICAgaWYoKGdyaWQuaXNXYWxrYWJsZUF0KHggKyBkeCwgeSArIDEpICYmICFncmlkLmlzV2Fsa2FibGVBdCh4LCB5ICsgMSkpIHx8XG4gICAgICAgICAgICAgICAoZ3JpZC5pc1dhbGthYmxlQXQoeCArIGR4LCB5IC0gMSkgJiYgIWdyaWQuaXNXYWxrYWJsZUF0KHgsIHkgLSAxKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3gsIHldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYoKGdyaWQuaXNXYWxrYWJsZUF0KHggKyAxLCB5ICsgZHkpICYmICFncmlkLmlzV2Fsa2FibGVBdCh4ICsgMSwgeSkpIHx8XG4gICAgICAgICAgICAgICAoZ3JpZC5pc1dhbGthYmxlQXQoeCAtIDEsIHkgKyBkeSkgJiYgIWdyaWQuaXNXYWxrYWJsZUF0KHggLSAxLCB5KSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3gsIHldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gd2hlbiBtb3ZpbmcgZGlhZ29uYWxseSwgbXVzdCBjaGVjayBmb3IgdmVydGljYWwvaG9yaXpvbnRhbCBqdW1wIHBvaW50c1xuICAgIGlmIChkeCAhPT0gMCAmJiBkeSAhPT0gMCkge1xuICAgICAgICBqeCA9IHRoaXMuX2p1bXAoeCArIGR4LCB5LCB4LCB5KTtcbiAgICAgICAgankgPSB0aGlzLl9qdW1wKHgsIHkgKyBkeSwgeCwgeSk7XG4gICAgICAgIGlmIChqeCB8fCBqeSkge1xuICAgICAgICAgICAgcmV0dXJuIFt4LCB5XTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIG1vdmluZyBkaWFnb25hbGx5LCBtdXN0IG1ha2Ugc3VyZSBvbmUgb2YgdGhlIHZlcnRpY2FsL2hvcml6b250YWxcbiAgICAvLyBuZWlnaGJvcnMgaXMgb3BlbiB0byBhbGxvdyB0aGUgcGF0aFxuICAgIGlmIChncmlkLmlzV2Fsa2FibGVBdCh4ICsgZHgsIHkpIHx8IGdyaWQuaXNXYWxrYWJsZUF0KHgsIHkgKyBkeSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2p1bXAoeCArIGR4LCB5ICsgZHksIHgsIHkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn07XG5cbi8qKlxuICogRmluZCB0aGUgbmVpZ2hib3JzIGZvciB0aGUgZ2l2ZW4gbm9kZS4gSWYgdGhlIG5vZGUgaGFzIGEgcGFyZW50LFxuICogcHJ1bmUgdGhlIG5laWdoYm9ycyBiYXNlZCBvbiB0aGUganVtcCBwb2ludCBzZWFyY2ggYWxnb3JpdGhtLCBvdGhlcndpc2VcbiAqIHJldHVybiBhbGwgYXZhaWxhYmxlIG5laWdoYm9ycy5cbiAqIEByZXR1cm4ge0FycmF5LjxbbnVtYmVyLCBudW1iZXJdPn0gVGhlIG5laWdoYm9ycyBmb3VuZC5cbiAqL1xuSnVtcFBvaW50RmluZGVyLnByb3RvdHlwZS5fZmluZE5laWdoYm9ycyA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnQsXG4gICAgICAgIHggPSBub2RlLngsIHkgPSBub2RlLnksXG4gICAgICAgIGdyaWQgPSB0aGlzLmdyaWQsXG4gICAgICAgIHB4LCBweSwgbngsIG55LCBkeCwgZHksXG4gICAgICAgIG5laWdoYm9ycyA9IFtdLCBuZWlnaGJvck5vZGVzLCBuZWlnaGJvck5vZGUsIGksIGw7XG5cbiAgICAvLyBkaXJlY3RlZCBwcnVuaW5nOiBjYW4gaWdub3JlIG1vc3QgbmVpZ2hib3JzLCB1bmxlc3MgZm9yY2VkLlxuICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgcHggPSBwYXJlbnQueDtcbiAgICAgICAgcHkgPSBwYXJlbnQueTtcbiAgICAgICAgLy8gZ2V0IHRoZSBub3JtYWxpemVkIGRpcmVjdGlvbiBvZiB0cmF2ZWxcbiAgICAgICAgZHggPSAoeCAtIHB4KSAvIE1hdGgubWF4KE1hdGguYWJzKHggLSBweCksIDEpO1xuICAgICAgICBkeSA9ICh5IC0gcHkpIC8gTWF0aC5tYXgoTWF0aC5hYnMoeSAtIHB5KSwgMSk7XG5cbiAgICAgICAgLy8gc2VhcmNoIGRpYWdvbmFsbHlcbiAgICAgICAgaWYgKGR4ICE9PSAwICYmIGR5ICE9PSAwKSB7XG4gICAgICAgICAgICBpZiAoZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSArIGR5KSkge1xuICAgICAgICAgICAgICAgIG5laWdoYm9ycy5wdXNoKFt4LCB5ICsgZHldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChncmlkLmlzV2Fsa2FibGVBdCh4ICsgZHgsIHkpKSB7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JzLnB1c2goW3ggKyBkeCwgeV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGdyaWQuaXNXYWxrYWJsZUF0KHgsIHkgKyBkeSkgfHwgZ3JpZC5pc1dhbGthYmxlQXQoeCArIGR4LCB5KSkge1xuICAgICAgICAgICAgICAgIG5laWdoYm9ycy5wdXNoKFt4ICsgZHgsIHkgKyBkeV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFncmlkLmlzV2Fsa2FibGVBdCh4IC0gZHgsIHkpICYmIGdyaWQuaXNXYWxrYWJsZUF0KHgsIHkgKyBkeSkpIHtcbiAgICAgICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbeCAtIGR4LCB5ICsgZHldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSAtIGR5KSAmJiBncmlkLmlzV2Fsa2FibGVBdCh4ICsgZHgsIHkpKSB7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JzLnB1c2goW3ggKyBkeCwgeSAtIGR5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2VhcmNoIGhvcml6b250YWxseS92ZXJ0aWNhbGx5XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYoZHggPT09IDApIHtcbiAgICAgICAgICAgICAgICBpZiAoZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSArIGR5KSkge1xuICAgICAgICAgICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbeCwgeSArIGR5XSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZ3JpZC5pc1dhbGthYmxlQXQoeCArIDEsIHkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbeCArIDEsIHkgKyBkeV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICghZ3JpZC5pc1dhbGthYmxlQXQoeCAtIDEsIHkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbeCAtIDEsIHkgKyBkeV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGdyaWQuaXNXYWxrYWJsZUF0KHggKyBkeCwgeSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3JzLnB1c2goW3ggKyBkeCwgeV0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWdyaWQuaXNXYWxrYWJsZUF0KHgsIHkgKyAxKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3JzLnB1c2goW3ggKyBkeCwgeSArIDFdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoIWdyaWQuaXNXYWxrYWJsZUF0KHgsIHkgLSAxKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3JzLnB1c2goW3ggKyBkeCwgeSAtIDFdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyByZXR1cm4gYWxsIG5laWdoYm9yc1xuICAgIGVsc2Uge1xuICAgICAgICBuZWlnaGJvck5vZGVzID0gZ3JpZC5nZXROZWlnaGJvcnMobm9kZSwgdHJ1ZSk7XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBuZWlnaGJvck5vZGVzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgbmVpZ2hib3JOb2RlID0gbmVpZ2hib3JOb2Rlc1tpXTtcbiAgICAgICAgICAgIG5laWdoYm9ycy5wdXNoKFtuZWlnaGJvck5vZGUueCwgbmVpZ2hib3JOb2RlLnldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICByZXR1cm4gbmVpZ2hib3JzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBKdW1wUG9pbnRGaW5kZXI7XG4iLCIvKipcbiAqIEBhdXRob3IgaW1vciAvIGh0dHBzOi8vZ2l0aHViLmNvbS9pbW9yXG4gKi9cbnZhciBIZXVyaXN0aWMgID0gcmVxdWlyZSgnLi4vY29yZS9IZXVyaXN0aWMnKTtcbnZhciBKdW1wUG9pbnRGaW5kZXIgPSByZXF1aXJlKCcuL0p1bXBQb2ludEZpbmRlcicpO1xuXG4vKipcbiAqIFBhdGggZmluZGVyIHVzaW5nIHRoZSBKdW1wIFBvaW50IFNlYXJjaCBhbGdvcml0aG0gYWxsb3dpbmcgb25seSBob3Jpem9udGFsXG4gKiBvciB2ZXJ0aWNhbCBtb3ZlbWVudHMuXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0XG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHQuaGV1cmlzdGljIEhldXJpc3RpYyBmdW5jdGlvbiB0byBlc3RpbWF0ZSB0aGUgZGlzdGFuY2VcbiAqICAgICAoZGVmYXVsdHMgdG8gbWFuaGF0dGFuKS5cbiAqL1xuZnVuY3Rpb24gT3J0aG9nb25hbEp1bXBQb2ludEZpbmRlcihvcHQpIHtcbiAgICBKdW1wUG9pbnRGaW5kZXIuY2FsbCh0aGlzLCBvcHQpO1xuICAgIG9wdCA9IG9wdCB8fCB7fTtcbiAgICB0aGlzLmhldXJpc3RpYyA9IG9wdC5oZXVyaXN0aWMgfHwgSGV1cmlzdGljLm1hbmhhdHRhbjtcbn1cblxuT3J0aG9nb25hbEp1bXBQb2ludEZpbmRlci5wcm90b3R5cGUgPSBuZXcgSnVtcFBvaW50RmluZGVyKCk7XG5PcnRob2dvbmFsSnVtcFBvaW50RmluZGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE9ydGhvZ29uYWxKdW1wUG9pbnRGaW5kZXI7XG5cbi8qKlxuICogU2VhcmNoIHJlY3Vyc2l2ZWx5IGluIHRoZSBkaXJlY3Rpb24gKHBhcmVudCAtPiBjaGlsZCksIHN0b3BwaW5nIG9ubHkgd2hlbiBhXG4gKiBqdW1wIHBvaW50IGlzIGZvdW5kLlxuICogQHByb3RlY3RlZFxuICogQHJldHVybiB7QXJyYXkuPFtudW1iZXIsIG51bWJlcl0+fSBUaGUgeCwgeSBjb29yZGluYXRlIG9mIHRoZSBqdW1wIHBvaW50XG4gKiAgICAgZm91bmQsIG9yIG51bGwgaWYgbm90IGZvdW5kXG4gKi9cbk9ydGhvZ29uYWxKdW1wUG9pbnRGaW5kZXIucHJvdG90eXBlLl9qdW1wID0gZnVuY3Rpb24oeCwgeSwgcHgsIHB5KSB7XG4gICAgdmFyIGdyaWQgPSB0aGlzLmdyaWQsXG4gICAgICAgIGR4ID0geCAtIHB4LCBkeSA9IHkgLSBweSwganhSaWdodCwganhMZWZ0O1xuXG4gICAgaWYgKCFncmlkLmlzV2Fsa2FibGVBdCh4LCB5KSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZih0aGlzLnRyYWNrSnVtcFJlY3Vyc2lvbiA9PT0gdHJ1ZSkge1xuICAgICAgICBncmlkLmdldE5vZGVBdCh4LCB5KS50ZXN0ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmIChncmlkLmdldE5vZGVBdCh4LCB5KSA9PT0gdGhpcy5lbmROb2RlKSB7XG4gICAgICAgIHJldHVybiBbeCwgeV07XG4gICAgfVxuXG4gICAgaWYgKGR4ICE9PSAwKSB7XG4gICAgICAgIGlmICgoZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSAtIDEpICYmICFncmlkLmlzV2Fsa2FibGVBdCh4IC0gZHgsIHkgLSAxKSkgfHxcbiAgICAgICAgICAgIChncmlkLmlzV2Fsa2FibGVBdCh4LCB5ICsgMSkgJiYgIWdyaWQuaXNXYWxrYWJsZUF0KHggLSBkeCwgeSArIDEpKSkge1xuICAgICAgICAgICAgcmV0dXJuIFt4LCB5XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChkeSAhPT0gMCkge1xuICAgICAgICBpZiAoKGdyaWQuaXNXYWxrYWJsZUF0KHggLSAxLCB5KSAmJiAhZ3JpZC5pc1dhbGthYmxlQXQoeCAtIDEsIHkgLSBkeSkpIHx8XG4gICAgICAgICAgICAoZ3JpZC5pc1dhbGthYmxlQXQoeCArIDEsIHkpICYmICFncmlkLmlzV2Fsa2FibGVBdCh4ICsgMSwgeSAtIGR5KSkpIHtcbiAgICAgICAgICAgIHJldHVybiBbeCwgeV07XG4gICAgICAgIH1cbiAgICAgICAganhSaWdodCA9IHRoaXMuX2p1bXAoeCArIDEsIHksIHgsIHkpO1xuICAgICAgICBqeExlZnQgPSB0aGlzLl9qdW1wKHggLSAxLCB5LCB4LCB5KTtcbiAgICAgICAgaWYgKGp4UmlnaHQgfHwganhMZWZ0KSB7XG4gICAgICAgICAgICByZXR1cm4gW3gsIHldO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IGhvcml6b250YWwgYW5kIHZlcnRpY2FsIG1vdmVtZW50cyBhcmUgYWxsb3dlZFwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fanVtcCh4ICsgZHgsIHkgKyBkeSwgeCwgeSk7XG59O1xuXG4vKipcbiAqIEZpbmQgdGhlIG5laWdoYm9ycyBmb3IgdGhlIGdpdmVuIG5vZGUuIElmIHRoZSBub2RlIGhhcyBhIHBhcmVudCxcbiAqIHBydW5lIHRoZSBuZWlnaGJvcnMgYmFzZWQgb24gdGhlIGp1bXAgcG9pbnQgc2VhcmNoIGFsZ29yaXRobSwgb3RoZXJ3aXNlXG4gKiByZXR1cm4gYWxsIGF2YWlsYWJsZSBuZWlnaGJvcnMuXG4gKiBAcmV0dXJuIHtBcnJheS48W251bWJlciwgbnVtYmVyXT59IFRoZSBuZWlnaGJvcnMgZm91bmQuXG4gKi9cbk9ydGhvZ29uYWxKdW1wUG9pbnRGaW5kZXIucHJvdG90eXBlLl9maW5kTmVpZ2hib3JzID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudCxcbiAgICAgICAgeCA9IG5vZGUueCwgeSA9IG5vZGUueSxcbiAgICAgICAgZ3JpZCA9IHRoaXMuZ3JpZCxcbiAgICAgICAgcHgsIHB5LCBueCwgbnksIGR4LCBkeSxcbiAgICAgICAgbmVpZ2hib3JzID0gW10sIG5laWdoYm9yTm9kZXMsIG5laWdoYm9yTm9kZSwgaSwgbDtcblxuICAgIC8vIGRpcmVjdGVkIHBydW5pbmc6IGNhbiBpZ25vcmUgbW9zdCBuZWlnaGJvcnMsIHVubGVzcyBmb3JjZWQuXG4gICAgaWYgKHBhcmVudCkge1xuICAgICAgICBweCA9IHBhcmVudC54O1xuICAgICAgICBweSA9IHBhcmVudC55O1xuICAgICAgICAvLyBnZXQgdGhlIG5vcm1hbGl6ZWQgZGlyZWN0aW9uIG9mIHRyYXZlbFxuICAgICAgICBkeCA9ICh4IC0gcHgpIC8gTWF0aC5tYXgoTWF0aC5hYnMoeCAtIHB4KSwgMSk7XG4gICAgICAgIGR5ID0gKHkgLSBweSkgLyBNYXRoLm1heChNYXRoLmFicyh5IC0gcHkpLCAxKTtcblxuICAgICAgICBpZiAoZHggIT09IDApIHtcbiAgICAgICAgICAgIGlmIChncmlkLmlzV2Fsa2FibGVBdCh4LCB5IC0gMSkpIHtcbiAgICAgICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbeCwgeSAtIDFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChncmlkLmlzV2Fsa2FibGVBdCh4LCB5ICsgMSkpIHtcbiAgICAgICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbeCwgeSArIDFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChncmlkLmlzV2Fsa2FibGVBdCh4ICsgZHgsIHkpKSB7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JzLnB1c2goW3ggKyBkeCwgeV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGR5ICE9PSAwKSB7XG4gICAgICAgICAgICBpZiAoZ3JpZC5pc1dhbGthYmxlQXQoeCAtIDEsIHkpKSB7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JzLnB1c2goW3ggLSAxLCB5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZ3JpZC5pc1dhbGthYmxlQXQoeCArIDEsIHkpKSB7XG4gICAgICAgICAgICAgICAgbmVpZ2hib3JzLnB1c2goW3ggKyAxLCB5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZ3JpZC5pc1dhbGthYmxlQXQoeCwgeSArIGR5KSkge1xuICAgICAgICAgICAgICAgIG5laWdoYm9ycy5wdXNoKFt4LCB5ICsgZHldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyByZXR1cm4gYWxsIG5laWdoYm9yc1xuICAgIGVsc2Uge1xuICAgICAgICBuZWlnaGJvck5vZGVzID0gZ3JpZC5nZXROZWlnaGJvcnMobm9kZSwgZmFsc2UpO1xuICAgICAgICBmb3IgKGkgPSAwLCBsID0gbmVpZ2hib3JOb2Rlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgIG5laWdoYm9yTm9kZSA9IG5laWdoYm9yTm9kZXNbaV07XG4gICAgICAgICAgICBuZWlnaGJvcnMucHVzaChbbmVpZ2hib3JOb2RlLngsIG5laWdoYm9yTm9kZS55XSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmVpZ2hib3JzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBPcnRob2dvbmFsSnVtcFBvaW50RmluZGVyO1xuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliLycpO1xuIiwiXG4vKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIHVybCA9IHJlcXVpcmUoJy4vdXJsJyk7XG52YXIgcGFyc2VyID0gcmVxdWlyZSgnc29ja2V0LmlvLXBhcnNlcicpO1xudmFyIE1hbmFnZXIgPSByZXF1aXJlKCcuL21hbmFnZXInKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ3NvY2tldC5pby1jbGllbnQnKTtcblxuLyoqXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBsb29rdXA7XG5cbi8qKlxuICogTWFuYWdlcnMgY2FjaGUuXG4gKi9cblxudmFyIGNhY2hlID0gZXhwb3J0cy5tYW5hZ2VycyA9IHt9O1xuXG4vKipcbiAqIExvb2tzIHVwIGFuIGV4aXN0aW5nIGBNYW5hZ2VyYCBmb3IgbXVsdGlwbGV4aW5nLlxuICogSWYgdGhlIHVzZXIgc3VtbW9uczpcbiAqXG4gKiAgIGBpbygnaHR0cDovL2xvY2FsaG9zdC9hJyk7YFxuICogICBgaW8oJ2h0dHA6Ly9sb2NhbGhvc3QvYicpO2BcbiAqXG4gKiBXZSByZXVzZSB0aGUgZXhpc3RpbmcgaW5zdGFuY2UgYmFzZWQgb24gc2FtZSBzY2hlbWUvcG9ydC9ob3N0LFxuICogYW5kIHdlIGluaXRpYWxpemUgc29ja2V0cyBmb3IgZWFjaCBuYW1lc3BhY2UuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBsb29rdXAodXJpLCBvcHRzKSB7XG4gIGlmICh0eXBlb2YgdXJpID09ICdvYmplY3QnKSB7XG4gICAgb3B0cyA9IHVyaTtcbiAgICB1cmkgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICB2YXIgcGFyc2VkID0gdXJsKHVyaSk7XG4gIHZhciBzb3VyY2UgPSBwYXJzZWQuc291cmNlO1xuICB2YXIgaWQgPSBwYXJzZWQuaWQ7XG4gIHZhciBpbztcblxuICBpZiAob3B0cy5mb3JjZU5ldyB8fCBmYWxzZSA9PT0gb3B0cy5tdWx0aXBsZXgpIHtcbiAgICBkZWJ1ZygnaWdub3Jpbmcgc29ja2V0IGNhY2hlIGZvciAlcycsIHNvdXJjZSk7XG4gICAgaW8gPSBNYW5hZ2VyKHNvdXJjZSwgb3B0cyk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKCFjYWNoZVtpZF0pIHtcbiAgICAgIGRlYnVnKCduZXcgaW8gaW5zdGFuY2UgZm9yICVzJywgc291cmNlKTtcbiAgICAgIGNhY2hlW2lkXSA9IE1hbmFnZXIoc291cmNlLCBvcHRzKTtcbiAgICB9XG4gICAgaW8gPSBjYWNoZVtpZF07XG4gIH1cblxuICByZXR1cm4gaW8uc29ja2V0KHBhcnNlZC5wYXRoKTtcbn1cblxuLyoqXG4gKiBQcm90b2NvbCB2ZXJzaW9uLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZXhwb3J0cy5wcm90b2NvbCA9IHBhcnNlci5wcm90b2NvbDtcblxuLyoqXG4gKiBgY29ubmVjdGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVyaVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5leHBvcnRzLmNvbm5lY3QgPSBsb29rdXA7XG5cbi8qKlxuICogRXhwb3NlIGNvbnN0cnVjdG9ycyBmb3Igc3RhbmRhbG9uZSBidWlsZC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmV4cG9ydHMuTWFuYWdlciA9IHJlcXVpcmUoJy4vbWFuYWdlcicpO1xuZXhwb3J0cy5Tb2NrZXQgPSByZXF1aXJlKCcuL3NvY2tldCcpO1xuIiwiXG4vKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIHVybCA9IHJlcXVpcmUoJy4vdXJsJyk7XG52YXIgZWlvID0gcmVxdWlyZSgnZW5naW5lLmlvLWNsaWVudCcpO1xudmFyIFNvY2tldCA9IHJlcXVpcmUoJy4vc29ja2V0Jyk7XG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJ2VtaXR0ZXInKTtcbnZhciBwYXJzZXIgPSByZXF1aXJlKCdzb2NrZXQuaW8tcGFyc2VyJyk7XG52YXIgb24gPSByZXF1aXJlKCcuL29uJyk7XG52YXIgYmluZCA9IHJlcXVpcmUoJ2JpbmQnKTtcbnZhciBvYmplY3QgPSByZXF1aXJlKCdvYmplY3QtY29tcG9uZW50Jyk7XG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdzb2NrZXQuaW8tY2xpZW50Om1hbmFnZXInKTtcblxuLyoqXG4gKiBNb2R1bGUgZXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gTWFuYWdlcjtcblxuLyoqXG4gKiBgTWFuYWdlcmAgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGVuZ2luZSBpbnN0YW5jZSBvciBlbmdpbmUgdXJpL29wdHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIE1hbmFnZXIodXJpLCBvcHRzKXtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE1hbmFnZXIpKSByZXR1cm4gbmV3IE1hbmFnZXIodXJpLCBvcHRzKTtcbiAgaWYgKCdvYmplY3QnID09IHR5cGVvZiB1cmkpIHtcbiAgICBvcHRzID0gdXJpO1xuICAgIHVyaSA9IHVuZGVmaW5lZDtcbiAgfVxuICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICBvcHRzLnBhdGggPSBvcHRzLnBhdGggfHwgJy9zb2NrZXQuaW8nO1xuICB0aGlzLm5zcHMgPSB7fTtcbiAgdGhpcy5zdWJzID0gW107XG4gIHRoaXMub3B0cyA9IG9wdHM7XG4gIHRoaXMucmVjb25uZWN0aW9uKG9wdHMucmVjb25uZWN0aW9uICE9PSBmYWxzZSk7XG4gIHRoaXMucmVjb25uZWN0aW9uQXR0ZW1wdHMob3B0cy5yZWNvbm5lY3Rpb25BdHRlbXB0cyB8fCBJbmZpbml0eSk7XG4gIHRoaXMucmVjb25uZWN0aW9uRGVsYXkob3B0cy5yZWNvbm5lY3Rpb25EZWxheSB8fCAxMDAwKTtcbiAgdGhpcy5yZWNvbm5lY3Rpb25EZWxheU1heChvcHRzLnJlY29ubmVjdGlvbkRlbGF5TWF4IHx8IDUwMDApO1xuICB0aGlzLnRpbWVvdXQobnVsbCA9PSBvcHRzLnRpbWVvdXQgPyAyMDAwMCA6IG9wdHMudGltZW91dCk7XG4gIHRoaXMucmVhZHlTdGF0ZSA9ICdjbG9zZWQnO1xuICB0aGlzLnVyaSA9IHVyaTtcbiAgdGhpcy5jb25uZWN0ZWQgPSAwO1xuICB0aGlzLmF0dGVtcHRzID0gMDtcbiAgdGhpcy5lbmNvZGluZyA9IGZhbHNlO1xuICB0aGlzLnBhY2tldEJ1ZmZlciA9IFtdO1xuICB0aGlzLmVuY29kZXIgPSBuZXcgcGFyc2VyLkVuY29kZXIoKTtcbiAgdGhpcy5kZWNvZGVyID0gbmV3IHBhcnNlci5EZWNvZGVyKCk7XG4gIHRoaXMub3BlbigpO1xufVxuXG4vKipcbiAqIE1peCBpbiBgRW1pdHRlcmAuXG4gKi9cblxuRW1pdHRlcihNYW5hZ2VyLnByb3RvdHlwZSk7XG5cbi8qKlxuICogU2V0cyB0aGUgYHJlY29ubmVjdGlvbmAgY29uZmlnLlxuICpcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gdHJ1ZS9mYWxzZSBpZiBpdCBzaG91bGQgYXV0b21hdGljYWxseSByZWNvbm5lY3RcbiAqIEByZXR1cm4ge01hbmFnZXJ9IHNlbGYgb3IgdmFsdWVcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuTWFuYWdlci5wcm90b3R5cGUucmVjb25uZWN0aW9uID0gZnVuY3Rpb24odil7XG4gIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRoaXMuX3JlY29ubmVjdGlvbjtcbiAgdGhpcy5fcmVjb25uZWN0aW9uID0gISF2O1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgcmVjb25uZWN0aW9uIGF0dGVtcHRzIGNvbmZpZy5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbWF4IHJlY29ubmVjdGlvbiBhdHRlbXB0cyBiZWZvcmUgZ2l2aW5nIHVwXG4gKiBAcmV0dXJuIHtNYW5hZ2VyfSBzZWxmIG9yIHZhbHVlXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbk1hbmFnZXIucHJvdG90eXBlLnJlY29ubmVjdGlvbkF0dGVtcHRzID0gZnVuY3Rpb24odil7XG4gIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRoaXMuX3JlY29ubmVjdGlvbkF0dGVtcHRzO1xuICB0aGlzLl9yZWNvbm5lY3Rpb25BdHRlbXB0cyA9IHY7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBkZWxheSBiZXR3ZWVuIHJlY29ubmVjdGlvbnMuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5XG4gKiBAcmV0dXJuIHtNYW5hZ2VyfSBzZWxmIG9yIHZhbHVlXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbk1hbmFnZXIucHJvdG90eXBlLnJlY29ubmVjdGlvbkRlbGF5ID0gZnVuY3Rpb24odil7XG4gIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRoaXMuX3JlY29ubmVjdGlvbkRlbGF5O1xuICB0aGlzLl9yZWNvbm5lY3Rpb25EZWxheSA9IHY7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBtYXhpbXVtIGRlbGF5IGJldHdlZW4gcmVjb25uZWN0aW9ucy5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gZGVsYXlcbiAqIEByZXR1cm4ge01hbmFnZXJ9IHNlbGYgb3IgdmFsdWVcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuTWFuYWdlci5wcm90b3R5cGUucmVjb25uZWN0aW9uRGVsYXlNYXggPSBmdW5jdGlvbih2KXtcbiAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdGhpcy5fcmVjb25uZWN0aW9uRGVsYXlNYXg7XG4gIHRoaXMuX3JlY29ubmVjdGlvbkRlbGF5TWF4ID0gdjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGNvbm5lY3Rpb24gdGltZW91dC4gYGZhbHNlYCB0byBkaXNhYmxlXG4gKlxuICogQHJldHVybiB7TWFuYWdlcn0gc2VsZiBvciB2YWx1ZVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5NYW5hZ2VyLnByb3RvdHlwZS50aW1lb3V0ID0gZnVuY3Rpb24odil7XG4gIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRoaXMuX3RpbWVvdXQ7XG4gIHRoaXMuX3RpbWVvdXQgPSB2O1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU3RhcnRzIHRyeWluZyB0byByZWNvbm5lY3QgaWYgcmVjb25uZWN0aW9uIGlzIGVuYWJsZWQgYW5kIHdlIGhhdmUgbm90XG4gKiBzdGFydGVkIHJlY29ubmVjdGluZyB5ZXRcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5NYW5hZ2VyLnByb3RvdHlwZS5tYXliZVJlY29ubmVjdE9uT3BlbiA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIXRoaXMub3BlblJlY29ubmVjdCAmJiAhdGhpcy5yZWNvbm5lY3RpbmcgJiYgdGhpcy5fcmVjb25uZWN0aW9uKSB7XG4gICAgLy8ga2VlcHMgcmVjb25uZWN0aW9uIGZyb20gZmlyaW5nIHR3aWNlIGZvciB0aGUgc2FtZSByZWNvbm5lY3Rpb24gbG9vcFxuICAgIHRoaXMub3BlblJlY29ubmVjdCA9IHRydWU7XG4gICAgdGhpcy5yZWNvbm5lY3QoKTtcbiAgfVxufTtcblxuXG4vKipcbiAqIFNldHMgdGhlIGN1cnJlbnQgdHJhbnNwb3J0IGBzb2NrZXRgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9wdGlvbmFsLCBjYWxsYmFja1xuICogQHJldHVybiB7TWFuYWdlcn0gc2VsZlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5NYW5hZ2VyLnByb3RvdHlwZS5vcGVuID1cbk1hbmFnZXIucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbihmbil7XG4gIGRlYnVnKCdyZWFkeVN0YXRlICVzJywgdGhpcy5yZWFkeVN0YXRlKTtcbiAgaWYgKH50aGlzLnJlYWR5U3RhdGUuaW5kZXhPZignb3BlbicpKSByZXR1cm4gdGhpcztcblxuICBkZWJ1Zygnb3BlbmluZyAlcycsIHRoaXMudXJpKTtcbiAgdGhpcy5lbmdpbmUgPSBlaW8odGhpcy51cmksIHRoaXMub3B0cyk7XG4gIHZhciBzb2NrZXQgPSB0aGlzLmVuZ2luZTtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnJlYWR5U3RhdGUgPSAnb3BlbmluZyc7XG5cbiAgLy8gZW1pdCBgb3BlbmBcbiAgdmFyIG9wZW5TdWIgPSBvbihzb2NrZXQsICdvcGVuJywgZnVuY3Rpb24oKSB7XG4gICAgc2VsZi5vbm9wZW4oKTtcbiAgICBmbiAmJiBmbigpO1xuICB9KTtcblxuICAvLyBlbWl0IGBjb25uZWN0X2Vycm9yYFxuICB2YXIgZXJyb3JTdWIgPSBvbihzb2NrZXQsICdlcnJvcicsIGZ1bmN0aW9uKGRhdGEpe1xuICAgIGRlYnVnKCdjb25uZWN0X2Vycm9yJyk7XG4gICAgc2VsZi5jbGVhbnVwKCk7XG4gICAgc2VsZi5yZWFkeVN0YXRlID0gJ2Nsb3NlZCc7XG4gICAgc2VsZi5lbWl0KCdjb25uZWN0X2Vycm9yJywgZGF0YSk7XG4gICAgaWYgKGZuKSB7XG4gICAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdDb25uZWN0aW9uIGVycm9yJyk7XG4gICAgICBlcnIuZGF0YSA9IGRhdGE7XG4gICAgICBmbihlcnIpO1xuICAgIH1cblxuICAgIHNlbGYubWF5YmVSZWNvbm5lY3RPbk9wZW4oKTtcbiAgfSk7XG5cbiAgLy8gZW1pdCBgY29ubmVjdF90aW1lb3V0YFxuICBpZiAoZmFsc2UgIT09IHRoaXMuX3RpbWVvdXQpIHtcbiAgICB2YXIgdGltZW91dCA9IHRoaXMuX3RpbWVvdXQ7XG4gICAgZGVidWcoJ2Nvbm5lY3QgYXR0ZW1wdCB3aWxsIHRpbWVvdXQgYWZ0ZXIgJWQnLCB0aW1lb3V0KTtcblxuICAgIC8vIHNldCB0aW1lclxuICAgIHZhciB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIGRlYnVnKCdjb25uZWN0IGF0dGVtcHQgdGltZWQgb3V0IGFmdGVyICVkJywgdGltZW91dCk7XG4gICAgICBvcGVuU3ViLmRlc3Ryb3koKTtcbiAgICAgIHNvY2tldC5jbG9zZSgpO1xuICAgICAgc29ja2V0LmVtaXQoJ2Vycm9yJywgJ3RpbWVvdXQnKTtcbiAgICAgIHNlbGYuZW1pdCgnY29ubmVjdF90aW1lb3V0JywgdGltZW91dCk7XG4gICAgfSwgdGltZW91dCk7XG5cbiAgICB0aGlzLnN1YnMucHVzaCh7XG4gICAgICBkZXN0cm95OiBmdW5jdGlvbigpe1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgdGhpcy5zdWJzLnB1c2gob3BlblN1Yik7XG4gIHRoaXMuc3Vicy5wdXNoKGVycm9yU3ViKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2FsbGVkIHVwb24gdHJhbnNwb3J0IG9wZW4uXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuTWFuYWdlci5wcm90b3R5cGUub25vcGVuID0gZnVuY3Rpb24oKXtcbiAgZGVidWcoJ29wZW4nKTtcblxuICAvLyBjbGVhciBvbGQgc3Vic1xuICB0aGlzLmNsZWFudXAoKTtcblxuICAvLyBtYXJrIGFzIG9wZW5cbiAgdGhpcy5yZWFkeVN0YXRlID0gJ29wZW4nO1xuICB0aGlzLmVtaXQoJ29wZW4nKTtcblxuICAvLyBhZGQgbmV3IHN1YnNcbiAgdmFyIHNvY2tldCA9IHRoaXMuZW5naW5lO1xuICB0aGlzLnN1YnMucHVzaChvbihzb2NrZXQsICdkYXRhJywgYmluZCh0aGlzLCAnb25kYXRhJykpKTtcbiAgdGhpcy5zdWJzLnB1c2gob24odGhpcy5kZWNvZGVyLCAnZGVjb2RlZCcsIGJpbmQodGhpcywgJ29uZGVjb2RlZCcpKSk7XG4gIHRoaXMuc3Vicy5wdXNoKG9uKHNvY2tldCwgJ2Vycm9yJywgYmluZCh0aGlzLCAnb25lcnJvcicpKSk7XG4gIHRoaXMuc3Vicy5wdXNoKG9uKHNvY2tldCwgJ2Nsb3NlJywgYmluZCh0aGlzLCAnb25jbG9zZScpKSk7XG59O1xuXG4vKipcbiAqIENhbGxlZCB3aXRoIGRhdGEuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuTWFuYWdlci5wcm90b3R5cGUub25kYXRhID0gZnVuY3Rpb24oZGF0YSl7XG4gIHRoaXMuZGVjb2Rlci5hZGQoZGF0YSk7XG59O1xuXG4vKipcbiAqIENhbGxlZCB3aGVuIHBhcnNlciBmdWxseSBkZWNvZGVzIGEgcGFja2V0LlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbk1hbmFnZXIucHJvdG90eXBlLm9uZGVjb2RlZCA9IGZ1bmN0aW9uKHBhY2tldCkge1xuICB0aGlzLmVtaXQoJ3BhY2tldCcsIHBhY2tldCk7XG59O1xuXG4vKipcbiAqIENhbGxlZCB1cG9uIHNvY2tldCBlcnJvci5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5NYW5hZ2VyLnByb3RvdHlwZS5vbmVycm9yID0gZnVuY3Rpb24oZXJyKXtcbiAgZGVidWcoJ2Vycm9yJywgZXJyKTtcbiAgdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgc29ja2V0IGZvciB0aGUgZ2l2ZW4gYG5zcGAuXG4gKlxuICogQHJldHVybiB7U29ja2V0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5NYW5hZ2VyLnByb3RvdHlwZS5zb2NrZXQgPSBmdW5jdGlvbihuc3Ape1xuICB2YXIgc29ja2V0ID0gdGhpcy5uc3BzW25zcF07XG4gIGlmICghc29ja2V0KSB7XG4gICAgc29ja2V0ID0gbmV3IFNvY2tldCh0aGlzLCBuc3ApO1xuICAgIHRoaXMubnNwc1tuc3BdID0gc29ja2V0O1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzb2NrZXQub24oJ2Nvbm5lY3QnLCBmdW5jdGlvbigpe1xuICAgICAgc2VsZi5jb25uZWN0ZWQrKztcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gc29ja2V0O1xufTtcblxuLyoqXG4gKiBDYWxsZWQgdXBvbiBhIHNvY2tldCBjbG9zZS5cbiAqXG4gKiBAcGFyYW0ge1NvY2tldH0gc29ja2V0XG4gKi9cblxuTWFuYWdlci5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKHNvY2tldCl7XG4gIC0tdGhpcy5jb25uZWN0ZWQgfHwgdGhpcy5jbG9zZSgpO1xufTtcblxuLyoqXG4gKiBXcml0ZXMgYSBwYWNrZXQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHBhY2tldFxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuTWFuYWdlci5wcm90b3R5cGUucGFja2V0ID0gZnVuY3Rpb24ocGFja2V0KXtcbiAgZGVidWcoJ3dyaXRpbmcgcGFja2V0ICVqJywgcGFja2V0KTtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICghc2VsZi5lbmNvZGluZykge1xuICAgIC8vIGVuY29kZSwgdGhlbiB3cml0ZSB0byBlbmdpbmUgd2l0aCByZXN1bHRcbiAgICBzZWxmLmVuY29kaW5nID0gdHJ1ZTtcbiAgICB0aGlzLmVuY29kZXIuZW5jb2RlKHBhY2tldCwgZnVuY3Rpb24oZW5jb2RlZFBhY2tldHMpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW5jb2RlZFBhY2tldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgc2VsZi5lbmdpbmUud3JpdGUoZW5jb2RlZFBhY2tldHNbaV0pO1xuICAgICAgfVxuICAgICAgc2VsZi5lbmNvZGluZyA9IGZhbHNlO1xuICAgICAgc2VsZi5wcm9jZXNzUGFja2V0UXVldWUoKTtcbiAgICB9KTtcbiAgfSBlbHNlIHsgLy8gYWRkIHBhY2tldCB0byB0aGUgcXVldWVcbiAgICBzZWxmLnBhY2tldEJ1ZmZlci5wdXNoKHBhY2tldCk7XG4gIH1cbn07XG5cbi8qKlxuICogSWYgcGFja2V0IGJ1ZmZlciBpcyBub24tZW1wdHksIGJlZ2lucyBlbmNvZGluZyB0aGVcbiAqIG5leHQgcGFja2V0IGluIGxpbmUuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuTWFuYWdlci5wcm90b3R5cGUucHJvY2Vzc1BhY2tldFF1ZXVlID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLnBhY2tldEJ1ZmZlci5sZW5ndGggPiAwICYmICF0aGlzLmVuY29kaW5nKSB7XG4gICAgdmFyIHBhY2sgPSB0aGlzLnBhY2tldEJ1ZmZlci5zaGlmdCgpO1xuICAgIHRoaXMucGFja2V0KHBhY2spO1xuICB9XG59O1xuXG4vKipcbiAqIENsZWFuIHVwIHRyYW5zcG9ydCBzdWJzY3JpcHRpb25zIGFuZCBwYWNrZXQgYnVmZmVyLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbk1hbmFnZXIucHJvdG90eXBlLmNsZWFudXAgPSBmdW5jdGlvbigpe1xuICB2YXIgc3ViO1xuICB3aGlsZSAoc3ViID0gdGhpcy5zdWJzLnNoaWZ0KCkpIHN1Yi5kZXN0cm95KCk7XG5cbiAgdGhpcy5wYWNrZXRCdWZmZXIgPSBbXTtcbiAgdGhpcy5lbmNvZGluZyA9IGZhbHNlO1xuXG4gIHRoaXMuZGVjb2Rlci5kZXN0cm95KCk7XG59O1xuXG4vKipcbiAqIENsb3NlIHRoZSBjdXJyZW50IHNvY2tldC5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5NYW5hZ2VyLnByb3RvdHlwZS5jbG9zZSA9XG5NYW5hZ2VyLnByb3RvdHlwZS5kaXNjb25uZWN0ID0gZnVuY3Rpb24oKXtcbiAgdGhpcy5za2lwUmVjb25uZWN0ID0gdHJ1ZTtcbiAgdGhpcy5lbmdpbmUuY2xvc2UoKTtcbn07XG5cbi8qKlxuICogQ2FsbGVkIHVwb24gZW5naW5lIGNsb3NlLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbk1hbmFnZXIucHJvdG90eXBlLm9uY2xvc2UgPSBmdW5jdGlvbihyZWFzb24pe1xuICBkZWJ1ZygnY2xvc2UnKTtcbiAgdGhpcy5jbGVhbnVwKCk7XG4gIHRoaXMucmVhZHlTdGF0ZSA9ICdjbG9zZWQnO1xuICB0aGlzLmVtaXQoJ2Nsb3NlJywgcmVhc29uKTtcbiAgaWYgKHRoaXMuX3JlY29ubmVjdGlvbiAmJiAhdGhpcy5za2lwUmVjb25uZWN0KSB7XG4gICAgdGhpcy5yZWNvbm5lY3QoKTtcbiAgfVxufTtcblxuLyoqXG4gKiBBdHRlbXB0IGEgcmVjb25uZWN0aW9uLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbk1hbmFnZXIucHJvdG90eXBlLnJlY29ubmVjdCA9IGZ1bmN0aW9uKCl7XG4gIGlmICh0aGlzLnJlY29ubmVjdGluZykgcmV0dXJuIHRoaXM7XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLmF0dGVtcHRzKys7XG5cbiAgaWYgKHRoaXMuYXR0ZW1wdHMgPiB0aGlzLl9yZWNvbm5lY3Rpb25BdHRlbXB0cykge1xuICAgIGRlYnVnKCdyZWNvbm5lY3QgZmFpbGVkJyk7XG4gICAgdGhpcy5lbWl0KCdyZWNvbm5lY3RfZmFpbGVkJyk7XG4gICAgdGhpcy5yZWNvbm5lY3RpbmcgPSBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgZGVsYXkgPSB0aGlzLmF0dGVtcHRzICogdGhpcy5yZWNvbm5lY3Rpb25EZWxheSgpO1xuICAgIGRlbGF5ID0gTWF0aC5taW4oZGVsYXksIHRoaXMucmVjb25uZWN0aW9uRGVsYXlNYXgoKSk7XG4gICAgZGVidWcoJ3dpbGwgd2FpdCAlZG1zIGJlZm9yZSByZWNvbm5lY3QgYXR0ZW1wdCcsIGRlbGF5KTtcblxuICAgIHRoaXMucmVjb25uZWN0aW5nID0gdHJ1ZTtcbiAgICB2YXIgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICBkZWJ1ZygnYXR0ZW1wdGluZyByZWNvbm5lY3QnKTtcbiAgICAgIHNlbGYuZW1pdCgncmVjb25uZWN0X2F0dGVtcHQnKTtcbiAgICAgIHNlbGYub3BlbihmdW5jdGlvbihlcnIpe1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgZGVidWcoJ3JlY29ubmVjdCBhdHRlbXB0IGVycm9yJyk7XG4gICAgICAgICAgc2VsZi5yZWNvbm5lY3RpbmcgPSBmYWxzZTtcbiAgICAgICAgICBzZWxmLnJlY29ubmVjdCgpO1xuICAgICAgICAgIHNlbGYuZW1pdCgncmVjb25uZWN0X2Vycm9yJywgZXJyLmRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlYnVnKCdyZWNvbm5lY3Qgc3VjY2VzcycpO1xuICAgICAgICAgIHNlbGYub25yZWNvbm5lY3QoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSwgZGVsYXkpO1xuXG4gICAgdGhpcy5zdWJzLnB1c2goe1xuICAgICAgZGVzdHJveTogZnVuY3Rpb24oKXtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufTtcblxuLyoqXG4gKiBDYWxsZWQgdXBvbiBzdWNjZXNzZnVsIHJlY29ubmVjdC5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5NYW5hZ2VyLnByb3RvdHlwZS5vbnJlY29ubmVjdCA9IGZ1bmN0aW9uKCl7XG4gIHZhciBhdHRlbXB0ID0gdGhpcy5hdHRlbXB0cztcbiAgdGhpcy5hdHRlbXB0cyA9IDA7XG4gIHRoaXMucmVjb25uZWN0aW5nID0gZmFsc2U7XG4gIHRoaXMuZW1pdCgncmVjb25uZWN0JywgYXR0ZW1wdCk7XG59O1xuIiwiXG4vKipcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gb247XG5cbi8qKlxuICogSGVscGVyIGZvciBzdWJzY3JpcHRpb25zLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fEV2ZW50RW1pdHRlcn0gb2JqIHdpdGggYEVtaXR0ZXJgIG1peGluIG9yIGBFdmVudEVtaXR0ZXJgXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgbmFtZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gb24ob2JqLCBldiwgZm4pIHtcbiAgb2JqLm9uKGV2LCBmbik7XG4gIHJldHVybiB7XG4gICAgZGVzdHJveTogZnVuY3Rpb24oKXtcbiAgICAgIG9iai5yZW1vdmVMaXN0ZW5lcihldiwgZm4pO1xuICAgIH1cbiAgfTtcbn1cbiIsIlxuLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBwYXJzZXIgPSByZXF1aXJlKCdzb2NrZXQuaW8tcGFyc2VyJyk7XG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJ2VtaXR0ZXInKTtcbnZhciB0b0FycmF5ID0gcmVxdWlyZSgndG8tYXJyYXknKTtcbnZhciBvbiA9IHJlcXVpcmUoJy4vb24nKTtcbnZhciBiaW5kID0gcmVxdWlyZSgnYmluZCcpO1xudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnc29ja2V0LmlvLWNsaWVudDpzb2NrZXQnKTtcbnZhciBoYXNCaW4gPSByZXF1aXJlKCdoYXMtYmluYXJ5LWRhdGEnKTtcbnZhciBpbmRleE9mID0gcmVxdWlyZSgnaW5kZXhvZicpO1xuXG4vKipcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IFNvY2tldDtcblxuLyoqXG4gKiBJbnRlcm5hbCBldmVudHMgKGJsYWNrbGlzdGVkKS5cbiAqIFRoZXNlIGV2ZW50cyBjYW4ndCBiZSBlbWl0dGVkIGJ5IHRoZSB1c2VyLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbnZhciBldmVudHMgPSB7XG4gIGNvbm5lY3Q6IDEsXG4gIGRpc2Nvbm5lY3Q6IDEsXG4gIGVycm9yOiAxXG59O1xuXG4vKipcbiAqIFNob3J0Y3V0IHRvIGBFbWl0dGVyI2VtaXRgLlxuICovXG5cbnZhciBlbWl0ID0gRW1pdHRlci5wcm90b3R5cGUuZW1pdDtcblxuLyoqXG4gKiBgU29ja2V0YCBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFNvY2tldChpbywgbnNwKXtcbiAgdGhpcy5pbyA9IGlvO1xuICB0aGlzLm5zcCA9IG5zcDtcbiAgdGhpcy5qc29uID0gdGhpczsgLy8gY29tcGF0XG4gIHRoaXMuaWRzID0gMDtcbiAgdGhpcy5hY2tzID0ge307XG4gIHRoaXMub3BlbigpO1xuICB0aGlzLmJ1ZmZlciA9IFtdO1xuICB0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICB0aGlzLmRpc2Nvbm5lY3RlZCA9IHRydWU7XG59XG5cbi8qKlxuICogTWl4IGluIGBFbWl0dGVyYC5cbiAqL1xuXG5FbWl0dGVyKFNvY2tldC5wcm90b3R5cGUpO1xuXG4vKipcbiAqIENhbGxlZCB1cG9uIGVuZ2luZSBgb3BlbmAuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU29ja2V0LnByb3RvdHlwZS5vcGVuID1cblNvY2tldC5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKCl7XG4gIGlmICh0aGlzLmNvbm5lY3RlZCkgcmV0dXJuIHRoaXM7XG4gIHZhciBpbyA9IHRoaXMuaW87XG4gIGlvLm9wZW4oKTsgLy8gZW5zdXJlIG9wZW5cbiAgdGhpcy5zdWJzID0gW1xuICAgIG9uKGlvLCAnb3BlbicsIGJpbmQodGhpcywgJ29ub3BlbicpKSxcbiAgICBvbihpbywgJ2Vycm9yJywgYmluZCh0aGlzLCAnb25lcnJvcicpKSxcbiAgICBvbihpbywgJ3BhY2tldCcsIGJpbmQodGhpcywgJ29ucGFja2V0JykpLFxuICAgIG9uKGlvLCAnY2xvc2UnLCBiaW5kKHRoaXMsICdvbmNsb3NlJykpXG4gIF07XG4gIGlmICgnb3BlbicgPT0gdGhpcy5pby5yZWFkeVN0YXRlKSB0aGlzLm9ub3BlbigpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2VuZHMgYSBgbWVzc2FnZWAgZXZlbnQuXG4gKlxuICogQHJldHVybiB7U29ja2V0fSBzZWxmXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblNvY2tldC5wcm90b3R5cGUuc2VuZCA9IGZ1bmN0aW9uKCl7XG4gIHZhciBhcmdzID0gdG9BcnJheShhcmd1bWVudHMpO1xuICBhcmdzLnVuc2hpZnQoJ21lc3NhZ2UnKTtcbiAgdGhpcy5lbWl0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogT3ZlcnJpZGUgYGVtaXRgLlxuICogSWYgdGhlIGV2ZW50IGlzIGluIGBldmVudHNgLCBpdCdzIGVtaXR0ZWQgbm9ybWFsbHkuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IG5hbWVcbiAqIEByZXR1cm4ge1NvY2tldH0gc2VsZlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5Tb2NrZXQucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihldil7XG4gIGlmIChldmVudHMuaGFzT3duUHJvcGVydHkoZXYpKSB7XG4gICAgZW1pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdmFyIGFyZ3MgPSB0b0FycmF5KGFyZ3VtZW50cyk7XG4gIHZhciBwYXJzZXJUeXBlID0gcGFyc2VyLkVWRU5UOyAvLyBkZWZhdWx0XG4gIGlmIChoYXNCaW4oYXJncykpIHsgcGFyc2VyVHlwZSA9IHBhcnNlci5CSU5BUllfRVZFTlQ7IH0gLy8gYmluYXJ5XG4gIHZhciBwYWNrZXQgPSB7IHR5cGU6IHBhcnNlclR5cGUsIGRhdGE6IGFyZ3MgfTtcblxuICAvLyBldmVudCBhY2sgY2FsbGJhY2tcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGFyZ3NbYXJncy5sZW5ndGggLSAxXSkge1xuICAgIGRlYnVnKCdlbWl0dGluZyBwYWNrZXQgd2l0aCBhY2sgaWQgJWQnLCB0aGlzLmlkcyk7XG4gICAgdGhpcy5hY2tzW3RoaXMuaWRzXSA9IGFyZ3MucG9wKCk7XG4gICAgcGFja2V0LmlkID0gdGhpcy5pZHMrKztcbiAgfVxuXG4gIHRoaXMucGFja2V0KHBhY2tldCk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNlbmRzIGEgcGFja2V0LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBwYWNrZXRcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblNvY2tldC5wcm90b3R5cGUucGFja2V0ID0gZnVuY3Rpb24ocGFja2V0KXtcbiAgcGFja2V0Lm5zcCA9IHRoaXMubnNwO1xuICB0aGlzLmlvLnBhY2tldChwYWNrZXQpO1xufTtcblxuLyoqXG4gKiBDYWxsZWQgdXBvbiBgZXJyb3JgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5Tb2NrZXQucHJvdG90eXBlLm9uZXJyb3IgPSBmdW5jdGlvbihkYXRhKXtcbiAgdGhpcy5lbWl0KCdlcnJvcicsIGRhdGEpO1xufTtcblxuLyoqXG4gKiBcIk9wZW5zXCIgdGhlIHNvY2tldC5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5Tb2NrZXQucHJvdG90eXBlLm9ub3BlbiA9IGZ1bmN0aW9uKCl7XG4gIGRlYnVnKCd0cmFuc3BvcnQgaXMgb3BlbiAtIGNvbm5lY3RpbmcnKTtcblxuICAvLyB3cml0ZSBjb25uZWN0IHBhY2tldCBpZiBuZWNlc3NhcnlcbiAgaWYgKCcvJyAhPSB0aGlzLm5zcCkge1xuICAgIHRoaXMucGFja2V0KHsgdHlwZTogcGFyc2VyLkNPTk5FQ1QgfSk7XG4gIH1cbn07XG5cbi8qKlxuICogQ2FsbGVkIHVwb24gZW5naW5lIGBjbG9zZWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHJlYXNvblxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU29ja2V0LnByb3RvdHlwZS5vbmNsb3NlID0gZnVuY3Rpb24ocmVhc29uKXtcbiAgZGVidWcoJ2Nsb3NlICglcyknLCByZWFzb24pO1xuICB0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICB0aGlzLmRpc2Nvbm5lY3RlZCA9IHRydWU7XG4gIHRoaXMuZW1pdCgnZGlzY29ubmVjdCcsIHJlYXNvbik7XG59O1xuXG4vKipcbiAqIENhbGxlZCB3aXRoIHNvY2tldCBwYWNrZXQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHBhY2tldFxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU29ja2V0LnByb3RvdHlwZS5vbnBhY2tldCA9IGZ1bmN0aW9uKHBhY2tldCl7XG4gIGlmIChwYWNrZXQubnNwICE9IHRoaXMubnNwKSByZXR1cm47XG5cbiAgc3dpdGNoIChwYWNrZXQudHlwZSkge1xuICAgIGNhc2UgcGFyc2VyLkNPTk5FQ1Q6XG4gICAgICB0aGlzLm9uY29ubmVjdCgpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIHBhcnNlci5FVkVOVDpcbiAgICAgIHRoaXMub25ldmVudChwYWNrZXQpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIHBhcnNlci5CSU5BUllfRVZFTlQ6XG4gICAgICB0aGlzLm9uZXZlbnQocGFja2V0KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBwYXJzZXIuQUNLOlxuICAgICAgdGhpcy5vbmFjayhwYWNrZXQpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIHBhcnNlci5ESVNDT05ORUNUOlxuICAgICAgdGhpcy5vbmRpc2Nvbm5lY3QoKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBwYXJzZXIuRVJST1I6XG4gICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgcGFja2V0LmRhdGEpO1xuICAgICAgYnJlYWs7XG4gIH1cbn07XG5cbi8qKlxuICogQ2FsbGVkIHVwb24gYSBzZXJ2ZXIgZXZlbnQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHBhY2tldFxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU29ja2V0LnByb3RvdHlwZS5vbmV2ZW50ID0gZnVuY3Rpb24ocGFja2V0KXtcbiAgdmFyIGFyZ3MgPSBwYWNrZXQuZGF0YSB8fCBbXTtcbiAgZGVidWcoJ2VtaXR0aW5nIGV2ZW50ICVqJywgYXJncyk7XG5cbiAgaWYgKG51bGwgIT0gcGFja2V0LmlkKSB7XG4gICAgZGVidWcoJ2F0dGFjaGluZyBhY2sgY2FsbGJhY2sgdG8gZXZlbnQnKTtcbiAgICBhcmdzLnB1c2godGhpcy5hY2socGFja2V0LmlkKSk7XG4gIH1cblxuICBpZiAodGhpcy5jb25uZWN0ZWQpIHtcbiAgICBlbWl0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuYnVmZmVyLnB1c2goYXJncyk7XG4gIH1cbn07XG5cbi8qKlxuICogUHJvZHVjZXMgYW4gYWNrIGNhbGxiYWNrIHRvIGVtaXQgd2l0aCBhbiBldmVudC5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5Tb2NrZXQucHJvdG90eXBlLmFjayA9IGZ1bmN0aW9uKGlkKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgc2VudCA9IGZhbHNlO1xuICByZXR1cm4gZnVuY3Rpb24oKXtcbiAgICAvLyBwcmV2ZW50IGRvdWJsZSBjYWxsYmFja3NcbiAgICBpZiAoc2VudCkgcmV0dXJuO1xuICAgIHNlbnQgPSB0cnVlO1xuICAgIHZhciBhcmdzID0gdG9BcnJheShhcmd1bWVudHMpO1xuICAgIGRlYnVnKCdzZW5kaW5nIGFjayAlaicsIGFyZ3MpO1xuICAgIHNlbGYucGFja2V0KHtcbiAgICAgIHR5cGU6IHBhcnNlci5BQ0ssXG4gICAgICBpZDogaWQsXG4gICAgICBkYXRhOiBhcmdzXG4gICAgfSk7XG4gIH07XG59O1xuXG4vKipcbiAqIENhbGxlZCB1cG9uIGEgc2VydmVyIGFja25vd2xlZ2VtZW50LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBwYWNrZXRcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblNvY2tldC5wcm90b3R5cGUub25hY2sgPSBmdW5jdGlvbihwYWNrZXQpe1xuICBkZWJ1ZygnY2FsbGluZyBhY2sgJXMgd2l0aCAlaicsIHBhY2tldC5pZCwgcGFja2V0LmRhdGEpO1xuICB2YXIgZm4gPSB0aGlzLmFja3NbcGFja2V0LmlkXTtcbiAgZm4uYXBwbHkodGhpcywgcGFja2V0LmRhdGEpO1xuICBkZWxldGUgdGhpcy5hY2tzW3BhY2tldC5pZF07XG59O1xuXG4vKipcbiAqIENhbGxlZCB1cG9uIHNlcnZlciBjb25uZWN0LlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblNvY2tldC5wcm90b3R5cGUub25jb25uZWN0ID0gZnVuY3Rpb24oKXtcbiAgdGhpcy5jb25uZWN0ZWQgPSB0cnVlO1xuICB0aGlzLmRpc2Nvbm5lY3RlZCA9IGZhbHNlO1xuICB0aGlzLmVtaXQoJ2Nvbm5lY3QnKTtcbiAgdGhpcy5lbWl0QnVmZmVyZWQoKTtcbn07XG5cbi8qKlxuICogRW1pdCBidWZmZXJlZCBldmVudHMuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU29ja2V0LnByb3RvdHlwZS5lbWl0QnVmZmVyZWQgPSBmdW5jdGlvbigpe1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuYnVmZmVyLmxlbmd0aDsgaSsrKSB7XG4gICAgZW1pdC5hcHBseSh0aGlzLCB0aGlzLmJ1ZmZlcltpXSk7XG4gIH1cbiAgdGhpcy5idWZmZXIgPSBbXTtcbn07XG5cbi8qKlxuICogQ2FsbGVkIHVwb24gc2VydmVyIGRpc2Nvbm5lY3QuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU29ja2V0LnByb3RvdHlwZS5vbmRpc2Nvbm5lY3QgPSBmdW5jdGlvbigpe1xuICBkZWJ1Zygnc2VydmVyIGRpc2Nvbm5lY3QgKCVzKScsIHRoaXMubnNwKTtcbiAgdGhpcy5kZXN0cm95KCk7XG4gIHRoaXMub25jbG9zZSgnaW8gc2VydmVyIGRpc2Nvbm5lY3QnKTtcbn07XG5cbi8qKlxuICogQ2FsbGVkIHVwb24gZm9yY2VkIGNsaWVudC9zZXJ2ZXIgc2lkZSBkaXNjb25uZWN0aW9ucyxcbiAqIHRoaXMgbWV0aG9kIGVuc3VyZXMgdGhlIG1hbmFnZXIgc3RvcHMgdHJhY2tpbmcgdXMgYW5kXG4gKiB0aGF0IHJlY29ubmVjdGlvbnMgZG9uJ3QgZ2V0IHRyaWdnZXJlZCBmb3IgdGhpcy5cbiAqXG4gKiBAYXBpIHByaXZhdGUuXG4gKi9cblxuU29ja2V0LnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKXtcbiAgLy8gY2xlYW4gc3Vic2NyaXB0aW9ucyB0byBhdm9pZCByZWNvbm5lY3Rpb25zXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5zdWJzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5zdWJzW2ldLmRlc3Ryb3koKTtcbiAgfVxuXG4gIHRoaXMuaW8uZGVzdHJveSh0aGlzKTtcbn07XG5cbi8qKlxuICogRGlzY29ubmVjdHMgdGhlIHNvY2tldCBtYW51YWxseS5cbiAqXG4gKiBAcmV0dXJuIHtTb2NrZXR9IHNlbGZcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuU29ja2V0LnByb3RvdHlwZS5jbG9zZSA9XG5Tb2NrZXQucHJvdG90eXBlLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbigpe1xuICBpZiAoIXRoaXMuY29ubmVjdGVkKSByZXR1cm4gdGhpcztcblxuICBkZWJ1ZygncGVyZm9ybWluZyBkaXNjb25uZWN0ICglcyknLCB0aGlzLm5zcCk7XG4gIHRoaXMucGFja2V0KHsgdHlwZTogcGFyc2VyLkRJU0NPTk5FQ1QgfSk7XG5cbiAgLy8gcmVtb3ZlIHNvY2tldCBmcm9tIHBvb2xcbiAgdGhpcy5kZXN0cm95KCk7XG5cbiAgLy8gZmlyZSBldmVudHNcbiAgdGhpcy5vbmNsb3NlKCdpbyBjbGllbnQgZGlzY29ubmVjdCcpO1xuICByZXR1cm4gdGhpcztcbn07XG4iLCJcbi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgcGFyc2V1cmkgPSByZXF1aXJlKCdwYXJzZXVyaScpO1xudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgnc29ja2V0LmlvLWNsaWVudDp1cmwnKTtcblxuLyoqXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHVybDtcblxuLyoqXG4gKiBVUkwgcGFyc2VyLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7T2JqZWN0fSBBbiBvYmplY3QgbWVhbnQgdG8gbWltaWMgd2luZG93LmxvY2F0aW9uLlxuICogICAgICAgICAgICAgICAgIERlZmF1bHRzIHRvIHdpbmRvdy5sb2NhdGlvbi5cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gdXJsKHVyaSwgbG9jKXtcbiAgdmFyIG9iaiA9IHVyaTtcblxuICAvLyBkZWZhdWx0IHRvIHdpbmRvdy5sb2NhdGlvblxuICB2YXIgbG9jID0gbG9jIHx8IGdsb2JhbC5sb2NhdGlvbjtcbiAgaWYgKG51bGwgPT0gdXJpKSB1cmkgPSBsb2MucHJvdG9jb2wgKyAnLy8nICsgbG9jLmhvc3RuYW1lO1xuXG4gIC8vIHJlbGF0aXZlIHBhdGggc3VwcG9ydFxuICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHVyaSkge1xuICAgIGlmICgnLycgPT0gdXJpLmNoYXJBdCgwKSkge1xuICAgICAgaWYgKCd1bmRlZmluZWQnICE9IHR5cGVvZiBsb2MpIHtcbiAgICAgICAgdXJpID0gbG9jLmhvc3RuYW1lICsgdXJpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghL14oaHR0cHM/fHdzcz8pOlxcL1xcLy8udGVzdCh1cmkpKSB7XG4gICAgICBkZWJ1ZygncHJvdG9jb2wtbGVzcyB1cmwgJXMnLCB1cmkpO1xuICAgICAgaWYgKCd1bmRlZmluZWQnICE9IHR5cGVvZiBsb2MpIHtcbiAgICAgICAgdXJpID0gbG9jLnByb3RvY29sICsgJy8vJyArIHVyaTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHVyaSA9ICdodHRwczovLycgKyB1cmk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gcGFyc2VcbiAgICBkZWJ1ZygncGFyc2UgJXMnLCB1cmkpO1xuICAgIG9iaiA9IHBhcnNldXJpKHVyaSk7XG4gIH1cblxuICAvLyBtYWtlIHN1cmUgd2UgdHJlYXQgYGxvY2FsaG9zdDo4MGAgYW5kIGBsb2NhbGhvc3RgIGVxdWFsbHlcbiAgaWYgKCgvKGh0dHB8d3MpLy50ZXN0KG9iai5wcm90b2NvbCkgJiYgODAgPT0gb2JqLnBvcnQpIHx8XG4gICAgICgvKGh0dHB8d3Mpcy8udGVzdChvYmoucHJvdG9jb2wpICYmIDQ0MyA9PSBvYmoucG9ydCkpIHtcbiAgICBkZWxldGUgb2JqLnBvcnQ7XG4gIH1cblxuICBvYmoucGF0aCA9IG9iai5wYXRoIHx8ICcvJztcblxuICAvLyBkZWZpbmUgdW5pcXVlIGlkXG4gIG9iai5pZCA9IG9iai5wcm90b2NvbCArIG9iai5ob3N0ICsgKG9iai5wb3J0ID8gKCc6JyArIG9iai5wb3J0KSA6ICcnKTtcblxuICAvLyBkZWZpbmUgaHJlZlxuICBvYmouaHJlZiA9IG9iai5wcm90b2NvbCArICc6Ly8nICsgb2JqLmhvc3QgKyAob2JqLnBvcnQgPyAoJzonICsgb2JqLnBvcnQpIDogJycpO1xuXG4gIHJldHVybiBvYmo7XG59XG4iLCJcbi8qKlxuICogU2xpY2UgcmVmZXJlbmNlLlxuICovXG5cbnZhciBzbGljZSA9IFtdLnNsaWNlO1xuXG4vKipcbiAqIEJpbmQgYG9iamAgdG8gYGZuYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufFN0cmluZ30gZm4gb3Igc3RyaW5nXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmosIGZuKXtcbiAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiBmbikgZm4gPSBvYmpbZm5dO1xuICBpZiAoJ2Z1bmN0aW9uJyAhPSB0eXBlb2YgZm4pIHRocm93IG5ldyBFcnJvcignYmluZCgpIHJlcXVpcmVzIGEgZnVuY3Rpb24nKTtcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gIHJldHVybiBmdW5jdGlvbigpe1xuICAgIHJldHVybiBmbi5hcHBseShvYmosIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICB9XG59O1xuIiwiXG4vKipcbiAqIEV4cG9zZSBgZGVidWcoKWAgYXMgdGhlIG1vZHVsZS5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRlYnVnO1xuXG4vKipcbiAqIENyZWF0ZSBhIGRlYnVnZ2VyIHdpdGggdGhlIGdpdmVuIGBuYW1lYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHJldHVybiB7VHlwZX1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZGVidWcobmFtZSkge1xuICBpZiAoIWRlYnVnLmVuYWJsZWQobmFtZSkpIHJldHVybiBmdW5jdGlvbigpe307XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGZtdCl7XG4gICAgZm10ID0gY29lcmNlKGZtdCk7XG5cbiAgICB2YXIgY3VyciA9IG5ldyBEYXRlO1xuICAgIHZhciBtcyA9IGN1cnIgLSAoZGVidWdbbmFtZV0gfHwgY3Vycik7XG4gICAgZGVidWdbbmFtZV0gPSBjdXJyO1xuXG4gICAgZm10ID0gbmFtZVxuICAgICAgKyAnICdcbiAgICAgICsgZm10XG4gICAgICArICcgKycgKyBkZWJ1Zy5odW1hbml6ZShtcyk7XG5cbiAgICAvLyBUaGlzIGhhY2tlcnkgaXMgcmVxdWlyZWQgZm9yIElFOFxuICAgIC8vIHdoZXJlIGBjb25zb2xlLmxvZ2AgZG9lc24ndCBoYXZlICdhcHBseSdcbiAgICB3aW5kb3cuY29uc29sZVxuICAgICAgJiYgY29uc29sZS5sb2dcbiAgICAgICYmIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5jYWxsKGNvbnNvbGUubG9nLCBjb25zb2xlLCBhcmd1bWVudHMpO1xuICB9XG59XG5cbi8qKlxuICogVGhlIGN1cnJlbnRseSBhY3RpdmUgZGVidWcgbW9kZSBuYW1lcy5cbiAqL1xuXG5kZWJ1Zy5uYW1lcyA9IFtdO1xuZGVidWcuc2tpcHMgPSBbXTtcblxuLyoqXG4gKiBFbmFibGVzIGEgZGVidWcgbW9kZSBieSBuYW1lLiBUaGlzIGNhbiBpbmNsdWRlIG1vZGVzXG4gKiBzZXBhcmF0ZWQgYnkgYSBjb2xvbiBhbmQgd2lsZGNhcmRzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmRlYnVnLmVuYWJsZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdHJ5IHtcbiAgICBsb2NhbFN0b3JhZ2UuZGVidWcgPSBuYW1lO1xuICB9IGNhdGNoKGUpe31cblxuICB2YXIgc3BsaXQgPSAobmFtZSB8fCAnJykuc3BsaXQoL1tcXHMsXSsvKVxuICAgICwgbGVuID0gc3BsaXQubGVuZ3RoO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBuYW1lID0gc3BsaXRbaV0ucmVwbGFjZSgnKicsICcuKj8nKTtcbiAgICBpZiAobmFtZVswXSA9PT0gJy0nKSB7XG4gICAgICBkZWJ1Zy5za2lwcy5wdXNoKG5ldyBSZWdFeHAoJ14nICsgbmFtZS5zdWJzdHIoMSkgKyAnJCcpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBkZWJ1Zy5uYW1lcy5wdXNoKG5ldyBSZWdFeHAoJ14nICsgbmFtZSArICckJykpO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBEaXNhYmxlIGRlYnVnIG91dHB1dC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmRlYnVnLmRpc2FibGUgPSBmdW5jdGlvbigpe1xuICBkZWJ1Zy5lbmFibGUoJycpO1xufTtcblxuLyoqXG4gKiBIdW1hbml6ZSB0aGUgZ2l2ZW4gYG1zYC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbVxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZGVidWcuaHVtYW5pemUgPSBmdW5jdGlvbihtcykge1xuICB2YXIgc2VjID0gMTAwMFxuICAgICwgbWluID0gNjAgKiAxMDAwXG4gICAgLCBob3VyID0gNjAgKiBtaW47XG5cbiAgaWYgKG1zID49IGhvdXIpIHJldHVybiAobXMgLyBob3VyKS50b0ZpeGVkKDEpICsgJ2gnO1xuICBpZiAobXMgPj0gbWluKSByZXR1cm4gKG1zIC8gbWluKS50b0ZpeGVkKDEpICsgJ20nO1xuICBpZiAobXMgPj0gc2VjKSByZXR1cm4gKG1zIC8gc2VjIHwgMCkgKyAncyc7XG4gIHJldHVybiBtcyArICdtcyc7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gbW9kZSBuYW1lIGlzIGVuYWJsZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZGVidWcuZW5hYmxlZCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGRlYnVnLnNraXBzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGRlYnVnLnNraXBzW2ldLnRlc3QobmFtZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGRlYnVnLm5hbWVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGRlYnVnLm5hbWVzW2ldLnRlc3QobmFtZSkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIENvZXJjZSBgdmFsYC5cbiAqL1xuXG5mdW5jdGlvbiBjb2VyY2UodmFsKSB7XG4gIGlmICh2YWwgaW5zdGFuY2VvZiBFcnJvcikgcmV0dXJuIHZhbC5zdGFjayB8fCB2YWwubWVzc2FnZTtcbiAgcmV0dXJuIHZhbDtcbn1cblxuLy8gcGVyc2lzdFxuXG50cnkge1xuICBpZiAod2luZG93LmxvY2FsU3RvcmFnZSkgZGVidWcuZW5hYmxlKGxvY2FsU3RvcmFnZS5kZWJ1Zyk7XG59IGNhdGNoKGUpe31cbiIsIlxuLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBpbmRleCA9IHJlcXVpcmUoJ2luZGV4b2YnKTtcblxuLyoqXG4gKiBFeHBvc2UgYEVtaXR0ZXJgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBFbWl0dGVyYC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIEVtaXR0ZXIob2JqKSB7XG4gIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xufTtcblxuLyoqXG4gKiBNaXhpbiB0aGUgZW1pdHRlciBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIG1peGluKG9iaikge1xuICBmb3IgKHZhciBrZXkgaW4gRW1pdHRlci5wcm90b3R5cGUpIHtcbiAgICBvYmpba2V5XSA9IEVtaXR0ZXIucHJvdG90eXBlW2tleV07XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBMaXN0ZW4gb24gdGhlIGdpdmVuIGBldmVudGAgd2l0aCBgZm5gLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24oZXZlbnQsIGZuKXtcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuICAodGhpcy5fY2FsbGJhY2tzW2V2ZW50XSA9IHRoaXMuX2NhbGxiYWNrc1tldmVudF0gfHwgW10pXG4gICAgLnB1c2goZm4pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhbiBgZXZlbnRgIGxpc3RlbmVyIHRoYXQgd2lsbCBiZSBpbnZva2VkIGEgc2luZ2xlXG4gKiB0aW1lIHRoZW4gYXV0b21hdGljYWxseSByZW1vdmVkLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcblxuICBmdW5jdGlvbiBvbigpIHtcbiAgICBzZWxmLm9mZihldmVudCwgb24pO1xuICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICBmbi5fb2ZmID0gb247XG4gIHRoaXMub24oZXZlbnQsIG9uKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgZm9yIGBldmVudGAgb3IgYWxsXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vZmYgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24oZXZlbnQsIGZuKXtcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuXG4gIC8vIGFsbFxuICBpZiAoMCA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgdGhpcy5fY2FsbGJhY2tzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBzcGVjaWZpYyBldmVudFxuICB2YXIgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzW2V2ZW50XTtcbiAgaWYgKCFjYWxsYmFja3MpIHJldHVybiB0aGlzO1xuXG4gIC8vIHJlbW92ZSBhbGwgaGFuZGxlcnNcbiAgaWYgKDEgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIGRlbGV0ZSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gcmVtb3ZlIHNwZWNpZmljIGhhbmRsZXJcbiAgdmFyIGkgPSBpbmRleChjYWxsYmFja3MsIGZuLl9vZmYgfHwgZm4pO1xuICBpZiAofmkpIGNhbGxiYWNrcy5zcGxpY2UoaSwgMSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBFbWl0IGBldmVudGAgd2l0aCB0aGUgZ2l2ZW4gYXJncy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7TWl4ZWR9IC4uLlxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oZXZlbnQpe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpXG4gICAgLCBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdO1xuXG4gIGlmIChjYWxsYmFja3MpIHtcbiAgICBjYWxsYmFja3MgPSBjYWxsYmFja3Muc2xpY2UoMCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNhbGxiYWNrcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgY2FsbGJhY2tzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYXJyYXkgb2YgY2FsbGJhY2tzIGZvciBgZXZlbnRgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHJldHVybiB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuICByZXR1cm4gdGhpcy5fY2FsbGJhY2tzW2V2ZW50XSB8fCBbXTtcbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgdGhpcyBlbWl0dGVyIGhhcyBgZXZlbnRgIGhhbmRsZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUuaGFzTGlzdGVuZXJzID0gZnVuY3Rpb24oZXZlbnQpe1xuICByZXR1cm4gISEgdGhpcy5saXN0ZW5lcnMoZXZlbnQpLmxlbmd0aDtcbn07XG4iLCJcbm1vZHVsZS5leHBvcnRzID0gIHJlcXVpcmUoJy4vbGliLycpO1xuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc29ja2V0Jyk7XG5cbi8qKlxuICogRXhwb3J0cyBwYXJzZXJcbiAqXG4gKiBAYXBpIHB1YmxpY1xuICpcbiAqL1xubW9kdWxlLmV4cG9ydHMucGFyc2VyID0gcmVxdWlyZSgnZW5naW5lLmlvLXBhcnNlcicpO1xuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciB0cmFuc3BvcnRzID0gcmVxdWlyZSgnLi90cmFuc3BvcnRzJyk7XG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJ2VtaXR0ZXInKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2VuZ2luZS5pby1jbGllbnQ6c29ja2V0Jyk7XG52YXIgaW5kZXggPSByZXF1aXJlKCdpbmRleG9mJyk7XG52YXIgcGFyc2VyID0gcmVxdWlyZSgnZW5naW5lLmlvLXBhcnNlcicpO1xudmFyIHBhcnNldXJpID0gcmVxdWlyZSgncGFyc2V1cmknKTtcbnZhciBwYXJzZWpzb24gPSByZXF1aXJlKCdwYXJzZWpzb24nKTtcbnZhciBwYXJzZXFzID0gcmVxdWlyZSgncGFyc2VxcycpO1xuXG4vKipcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gU29ja2V0O1xuXG4vKipcbiAqIE5vb3AgZnVuY3Rpb24uXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbm9vcCgpe31cblxuLyoqXG4gKiBTb2NrZXQgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSB1cmkgb3Igb3B0aW9uc1xuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gU29ja2V0KHVyaSwgb3B0cyl7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTb2NrZXQpKSByZXR1cm4gbmV3IFNvY2tldCh1cmksIG9wdHMpO1xuXG4gIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gIGlmICh1cmkgJiYgJ29iamVjdCcgPT0gdHlwZW9mIHVyaSkge1xuICAgIG9wdHMgPSB1cmk7XG4gICAgdXJpID0gbnVsbDtcbiAgfVxuXG4gIGlmICh1cmkpIHtcbiAgICB1cmkgPSBwYXJzZXVyaSh1cmkpO1xuICAgIG9wdHMuaG9zdCA9IHVyaS5ob3N0O1xuICAgIG9wdHMuc2VjdXJlID0gdXJpLnByb3RvY29sID09ICdodHRwcycgfHwgdXJpLnByb3RvY29sID09ICd3c3MnO1xuICAgIG9wdHMucG9ydCA9IHVyaS5wb3J0O1xuICAgIGlmICh1cmkucXVlcnkpIG9wdHMucXVlcnkgPSB1cmkucXVlcnk7XG4gIH1cblxuICB0aGlzLnNlY3VyZSA9IG51bGwgIT0gb3B0cy5zZWN1cmUgPyBvcHRzLnNlY3VyZSA6XG4gICAgKGdsb2JhbC5sb2NhdGlvbiAmJiAnaHR0cHM6JyA9PSBsb2NhdGlvbi5wcm90b2NvbCk7XG5cbiAgaWYgKG9wdHMuaG9zdCkge1xuICAgIHZhciBwaWVjZXMgPSBvcHRzLmhvc3Quc3BsaXQoJzonKTtcbiAgICBvcHRzLmhvc3RuYW1lID0gcGllY2VzLnNoaWZ0KCk7XG4gICAgaWYgKHBpZWNlcy5sZW5ndGgpIG9wdHMucG9ydCA9IHBpZWNlcy5wb3AoKTtcbiAgfVxuXG4gIHRoaXMuYWdlbnQgPSBvcHRzLmFnZW50IHx8IGZhbHNlO1xuICB0aGlzLmhvc3RuYW1lID0gb3B0cy5ob3N0bmFtZSB8fFxuICAgIChnbG9iYWwubG9jYXRpb24gPyBsb2NhdGlvbi5ob3N0bmFtZSA6ICdsb2NhbGhvc3QnKTtcbiAgdGhpcy5wb3J0ID0gb3B0cy5wb3J0IHx8IChnbG9iYWwubG9jYXRpb24gJiYgbG9jYXRpb24ucG9ydCA/XG4gICAgICAgbG9jYXRpb24ucG9ydCA6XG4gICAgICAgKHRoaXMuc2VjdXJlID8gNDQzIDogODApKTtcbiAgdGhpcy5xdWVyeSA9IG9wdHMucXVlcnkgfHwge307XG4gIGlmICgnc3RyaW5nJyA9PSB0eXBlb2YgdGhpcy5xdWVyeSkgdGhpcy5xdWVyeSA9IHBhcnNlcXMuZGVjb2RlKHRoaXMucXVlcnkpO1xuICB0aGlzLnVwZ3JhZGUgPSBmYWxzZSAhPT0gb3B0cy51cGdyYWRlO1xuICB0aGlzLnBhdGggPSAob3B0cy5wYXRoIHx8ICcvZW5naW5lLmlvJykucmVwbGFjZSgvXFwvJC8sICcnKSArICcvJztcbiAgdGhpcy5mb3JjZUpTT05QID0gISFvcHRzLmZvcmNlSlNPTlA7XG4gIHRoaXMuZm9yY2VCYXNlNjQgPSAhIW9wdHMuZm9yY2VCYXNlNjQ7XG4gIHRoaXMudGltZXN0YW1wUGFyYW0gPSBvcHRzLnRpbWVzdGFtcFBhcmFtIHx8ICd0JztcbiAgdGhpcy50aW1lc3RhbXBSZXF1ZXN0cyA9IG9wdHMudGltZXN0YW1wUmVxdWVzdHM7XG4gIHRoaXMudHJhbnNwb3J0cyA9IG9wdHMudHJhbnNwb3J0cyB8fCBbJ3BvbGxpbmcnLCAnd2Vic29ja2V0J107XG4gIHRoaXMucmVhZHlTdGF0ZSA9ICcnO1xuICB0aGlzLndyaXRlQnVmZmVyID0gW107XG4gIHRoaXMuY2FsbGJhY2tCdWZmZXIgPSBbXTtcbiAgdGhpcy5wb2xpY3lQb3J0ID0gb3B0cy5wb2xpY3lQb3J0IHx8IDg0MztcbiAgdGhpcy5yZW1lbWJlclVwZ3JhZGUgPSBvcHRzLnJlbWVtYmVyVXBncmFkZSB8fCBmYWxzZTtcbiAgdGhpcy5vcGVuKCk7XG4gIHRoaXMuYmluYXJ5VHlwZSA9IG51bGw7XG4gIHRoaXMub25seUJpbmFyeVVwZ3JhZGVzID0gb3B0cy5vbmx5QmluYXJ5VXBncmFkZXM7XG59XG5cblNvY2tldC5wcmlvcldlYnNvY2tldFN1Y2Nlc3MgPSBmYWxzZTtcblxuLyoqXG4gKiBNaXggaW4gYEVtaXR0ZXJgLlxuICovXG5cbkVtaXR0ZXIoU29ja2V0LnByb3RvdHlwZSk7XG5cbi8qKlxuICogUHJvdG9jb2wgdmVyc2lvbi5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblNvY2tldC5wcm90b2NvbCA9IHBhcnNlci5wcm90b2NvbDsgLy8gdGhpcyBpcyBhbiBpbnRcblxuLyoqXG4gKiBFeHBvc2UgZGVwcyBmb3IgbGVnYWN5IGNvbXBhdGliaWxpdHlcbiAqIGFuZCBzdGFuZGFsb25lIGJyb3dzZXIgYWNjZXNzLlxuICovXG5cblNvY2tldC5Tb2NrZXQgPSBTb2NrZXQ7XG5Tb2NrZXQuVHJhbnNwb3J0ID0gcmVxdWlyZSgnLi90cmFuc3BvcnQnKTtcblNvY2tldC50cmFuc3BvcnRzID0gcmVxdWlyZSgnLi90cmFuc3BvcnRzJyk7XG5Tb2NrZXQucGFyc2VyID0gcmVxdWlyZSgnZW5naW5lLmlvLXBhcnNlcicpO1xuXG4vKipcbiAqIENyZWF0ZXMgdHJhbnNwb3J0IG9mIHRoZSBnaXZlbiB0eXBlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0cmFuc3BvcnQgbmFtZVxuICogQHJldHVybiB7VHJhbnNwb3J0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU29ja2V0LnByb3RvdHlwZS5jcmVhdGVUcmFuc3BvcnQgPSBmdW5jdGlvbiAobmFtZSkge1xuICBkZWJ1ZygnY3JlYXRpbmcgdHJhbnNwb3J0IFwiJXNcIicsIG5hbWUpO1xuICB2YXIgcXVlcnkgPSBjbG9uZSh0aGlzLnF1ZXJ5KTtcblxuICAvLyBhcHBlbmQgZW5naW5lLmlvIHByb3RvY29sIGlkZW50aWZpZXJcbiAgcXVlcnkuRUlPID0gcGFyc2VyLnByb3RvY29sO1xuXG4gIC8vIHRyYW5zcG9ydCBuYW1lXG4gIHF1ZXJ5LnRyYW5zcG9ydCA9IG5hbWU7XG5cbiAgLy8gc2Vzc2lvbiBpZCBpZiB3ZSBhbHJlYWR5IGhhdmUgb25lXG4gIGlmICh0aGlzLmlkKSBxdWVyeS5zaWQgPSB0aGlzLmlkO1xuXG4gIHZhciB0cmFuc3BvcnQgPSBuZXcgdHJhbnNwb3J0c1tuYW1lXSh7XG4gICAgYWdlbnQ6IHRoaXMuYWdlbnQsXG4gICAgaG9zdG5hbWU6IHRoaXMuaG9zdG5hbWUsXG4gICAgcG9ydDogdGhpcy5wb3J0LFxuICAgIHNlY3VyZTogdGhpcy5zZWN1cmUsXG4gICAgcGF0aDogdGhpcy5wYXRoLFxuICAgIHF1ZXJ5OiBxdWVyeSxcbiAgICBmb3JjZUpTT05QOiB0aGlzLmZvcmNlSlNPTlAsXG4gICAgZm9yY2VCYXNlNjQ6IHRoaXMuZm9yY2VCYXNlNjQsXG4gICAgdGltZXN0YW1wUmVxdWVzdHM6IHRoaXMudGltZXN0YW1wUmVxdWVzdHMsXG4gICAgdGltZXN0YW1wUGFyYW06IHRoaXMudGltZXN0YW1wUGFyYW0sXG4gICAgcG9saWN5UG9ydDogdGhpcy5wb2xpY3lQb3J0LFxuICAgIHNvY2tldDogdGhpc1xuICB9KTtcblxuICByZXR1cm4gdHJhbnNwb3J0O1xufTtcblxuZnVuY3Rpb24gY2xvbmUgKG9iaikge1xuICB2YXIgbyA9IHt9O1xuICBmb3IgKHZhciBpIGluIG9iaikge1xuICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgIG9baV0gPSBvYmpbaV07XG4gICAgfVxuICB9XG4gIHJldHVybiBvO1xufVxuXG4vKipcbiAqIEluaXRpYWxpemVzIHRyYW5zcG9ydCB0byB1c2UgYW5kIHN0YXJ0cyBwcm9iZS5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuU29ja2V0LnByb3RvdHlwZS5vcGVuID0gZnVuY3Rpb24gKCkge1xuICB2YXIgdHJhbnNwb3J0O1xuICBpZiAodGhpcy5yZW1lbWJlclVwZ3JhZGUgJiYgU29ja2V0LnByaW9yV2Vic29ja2V0U3VjY2VzcyAmJiB0aGlzLnRyYW5zcG9ydHMuaW5kZXhPZignd2Vic29ja2V0JykgIT0gLTEpIHtcbiAgICB0cmFuc3BvcnQgPSAnd2Vic29ja2V0JztcbiAgfSBlbHNlIHtcbiAgICB0cmFuc3BvcnQgPSB0aGlzLnRyYW5zcG9ydHNbMF07XG4gIH1cbiAgdGhpcy5yZWFkeVN0YXRlID0gJ29wZW5pbmcnO1xuICB2YXIgdHJhbnNwb3J0ID0gdGhpcy5jcmVhdGVUcmFuc3BvcnQodHJhbnNwb3J0KTtcbiAgdHJhbnNwb3J0Lm9wZW4oKTtcbiAgdGhpcy5zZXRUcmFuc3BvcnQodHJhbnNwb3J0KTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgY3VycmVudCB0cmFuc3BvcnQuIERpc2FibGVzIHRoZSBleGlzdGluZyBvbmUgKGlmIGFueSkuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU29ja2V0LnByb3RvdHlwZS5zZXRUcmFuc3BvcnQgPSBmdW5jdGlvbih0cmFuc3BvcnQpe1xuICBkZWJ1Zygnc2V0dGluZyB0cmFuc3BvcnQgJXMnLCB0cmFuc3BvcnQubmFtZSk7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAodGhpcy50cmFuc3BvcnQpIHtcbiAgICBkZWJ1ZygnY2xlYXJpbmcgZXhpc3RpbmcgdHJhbnNwb3J0ICVzJywgdGhpcy50cmFuc3BvcnQubmFtZSk7XG4gICAgdGhpcy50cmFuc3BvcnQucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gIH1cblxuICAvLyBzZXQgdXAgdHJhbnNwb3J0XG4gIHRoaXMudHJhbnNwb3J0ID0gdHJhbnNwb3J0O1xuXG4gIC8vIHNldCB1cCB0cmFuc3BvcnQgbGlzdGVuZXJzXG4gIHRyYW5zcG9ydFxuICAub24oJ2RyYWluJywgZnVuY3Rpb24oKXtcbiAgICBzZWxmLm9uRHJhaW4oKTtcbiAgfSlcbiAgLm9uKCdwYWNrZXQnLCBmdW5jdGlvbihwYWNrZXQpe1xuICAgIHNlbGYub25QYWNrZXQocGFja2V0KTtcbiAgfSlcbiAgLm9uKCdlcnJvcicsIGZ1bmN0aW9uKGUpe1xuICAgIHNlbGYub25FcnJvcihlKTtcbiAgfSlcbiAgLm9uKCdjbG9zZScsIGZ1bmN0aW9uKCl7XG4gICAgc2VsZi5vbkNsb3NlKCd0cmFuc3BvcnQgY2xvc2UnKTtcbiAgfSk7XG59O1xuXG4vKipcbiAqIFByb2JlcyBhIHRyYW5zcG9ydC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdHJhbnNwb3J0IG5hbWVcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblNvY2tldC5wcm90b3R5cGUucHJvYmUgPSBmdW5jdGlvbiAobmFtZSkge1xuICBkZWJ1ZygncHJvYmluZyB0cmFuc3BvcnQgXCIlc1wiJywgbmFtZSk7XG4gIHZhciB0cmFuc3BvcnQgPSB0aGlzLmNyZWF0ZVRyYW5zcG9ydChuYW1lLCB7IHByb2JlOiAxIH0pXG4gICAgLCBmYWlsZWQgPSBmYWxzZVxuICAgICwgc2VsZiA9IHRoaXM7XG5cbiAgU29ja2V0LnByaW9yV2Vic29ja2V0U3VjY2VzcyA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIG9uVHJhbnNwb3J0T3Blbigpe1xuICAgIGlmIChzZWxmLm9ubHlCaW5hcnlVcGdyYWRlcykge1xuICAgICAgdmFyIHVwZ3JhZGVMb3Nlc0JpbmFyeSA9ICF0aGlzLnN1cHBvcnRzQmluYXJ5ICYmIHNlbGYudHJhbnNwb3J0LnN1cHBvcnRzQmluYXJ5O1xuICAgICAgZmFpbGVkID0gZmFpbGVkIHx8IHVwZ3JhZGVMb3Nlc0JpbmFyeTtcbiAgICB9XG4gICAgaWYgKGZhaWxlZCkgcmV0dXJuO1xuXG4gICAgZGVidWcoJ3Byb2JlIHRyYW5zcG9ydCBcIiVzXCIgb3BlbmVkJywgbmFtZSk7XG4gICAgdHJhbnNwb3J0LnNlbmQoW3sgdHlwZTogJ3BpbmcnLCBkYXRhOiAncHJvYmUnIH1dKTtcbiAgICB0cmFuc3BvcnQub25jZSgncGFja2V0JywgZnVuY3Rpb24gKG1zZykge1xuICAgICAgaWYgKGZhaWxlZCkgcmV0dXJuO1xuICAgICAgaWYgKCdwb25nJyA9PSBtc2cudHlwZSAmJiAncHJvYmUnID09IG1zZy5kYXRhKSB7XG4gICAgICAgIGRlYnVnKCdwcm9iZSB0cmFuc3BvcnQgXCIlc1wiIHBvbmcnLCBuYW1lKTtcbiAgICAgICAgc2VsZi51cGdyYWRpbmcgPSB0cnVlO1xuICAgICAgICBzZWxmLmVtaXQoJ3VwZ3JhZGluZycsIHRyYW5zcG9ydCk7XG4gICAgICAgIFNvY2tldC5wcmlvcldlYnNvY2tldFN1Y2Nlc3MgPSAnd2Vic29ja2V0JyA9PSB0cmFuc3BvcnQubmFtZTtcblxuICAgICAgICBkZWJ1ZygncGF1c2luZyBjdXJyZW50IHRyYW5zcG9ydCBcIiVzXCInLCBzZWxmLnRyYW5zcG9ydC5uYW1lKTtcbiAgICAgICAgc2VsZi50cmFuc3BvcnQucGF1c2UoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmIChmYWlsZWQpIHJldHVybjtcbiAgICAgICAgICBpZiAoJ2Nsb3NlZCcgPT0gc2VsZi5yZWFkeVN0YXRlIHx8ICdjbG9zaW5nJyA9PSBzZWxmLnJlYWR5U3RhdGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGVidWcoJ2NoYW5naW5nIHRyYW5zcG9ydCBhbmQgc2VuZGluZyB1cGdyYWRlIHBhY2tldCcpO1xuXG4gICAgICAgICAgY2xlYW51cCgpO1xuXG4gICAgICAgICAgc2VsZi5zZXRUcmFuc3BvcnQodHJhbnNwb3J0KTtcbiAgICAgICAgICB0cmFuc3BvcnQuc2VuZChbeyB0eXBlOiAndXBncmFkZScgfV0pO1xuICAgICAgICAgIHNlbGYuZW1pdCgndXBncmFkZScsIHRyYW5zcG9ydCk7XG4gICAgICAgICAgdHJhbnNwb3J0ID0gbnVsbDtcbiAgICAgICAgICBzZWxmLnVwZ3JhZGluZyA9IGZhbHNlO1xuICAgICAgICAgIHNlbGYuZmx1c2goKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWJ1ZygncHJvYmUgdHJhbnNwb3J0IFwiJXNcIiBmYWlsZWQnLCBuYW1lKTtcbiAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcigncHJvYmUgZXJyb3InKTtcbiAgICAgICAgZXJyLnRyYW5zcG9ydCA9IHRyYW5zcG9ydC5uYW1lO1xuICAgICAgICBzZWxmLmVtaXQoJ3VwZ3JhZGVFcnJvcicsIGVycik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBmcmVlemVUcmFuc3BvcnQoKSB7XG4gICAgaWYgKGZhaWxlZCkgcmV0dXJuO1xuXG4gICAgLy8gQW55IGNhbGxiYWNrIGNhbGxlZCBieSB0cmFuc3BvcnQgc2hvdWxkIGJlIGlnbm9yZWQgc2luY2Ugbm93XG4gICAgZmFpbGVkID0gdHJ1ZTtcblxuICAgIGNsZWFudXAoKTtcblxuICAgIHRyYW5zcG9ydC5jbG9zZSgpO1xuICAgIHRyYW5zcG9ydCA9IG51bGw7XG4gIH1cblxuICAvL0hhbmRsZSBhbnkgZXJyb3IgdGhhdCBoYXBwZW5zIHdoaWxlIHByb2JpbmdcbiAgZnVuY3Rpb24gb25lcnJvcihlcnIpIHtcbiAgICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IoJ3Byb2JlIGVycm9yOiAnICsgZXJyKTtcbiAgICBlcnJvci50cmFuc3BvcnQgPSB0cmFuc3BvcnQubmFtZTtcblxuICAgIGZyZWV6ZVRyYW5zcG9ydCgpO1xuXG4gICAgZGVidWcoJ3Byb2JlIHRyYW5zcG9ydCBcIiVzXCIgZmFpbGVkIGJlY2F1c2Ugb2YgZXJyb3I6ICVzJywgbmFtZSwgZXJyKTtcblxuICAgIHNlbGYuZW1pdCgndXBncmFkZUVycm9yJywgZXJyb3IpO1xuICB9XG5cbiAgZnVuY3Rpb24gb25UcmFuc3BvcnRDbG9zZSgpe1xuICAgIG9uZXJyb3IoXCJ0cmFuc3BvcnQgY2xvc2VkXCIpO1xuICB9XG5cbiAgLy9XaGVuIHRoZSBzb2NrZXQgaXMgY2xvc2VkIHdoaWxlIHdlJ3JlIHByb2JpbmdcbiAgZnVuY3Rpb24gb25jbG9zZSgpe1xuICAgIG9uZXJyb3IoXCJzb2NrZXQgY2xvc2VkXCIpO1xuICB9XG5cbiAgLy9XaGVuIHRoZSBzb2NrZXQgaXMgdXBncmFkZWQgd2hpbGUgd2UncmUgcHJvYmluZ1xuICBmdW5jdGlvbiBvbnVwZ3JhZGUodG8pe1xuICAgIGlmICh0cmFuc3BvcnQgJiYgdG8ubmFtZSAhPSB0cmFuc3BvcnQubmFtZSkge1xuICAgICAgZGVidWcoJ1wiJXNcIiB3b3JrcyAtIGFib3J0aW5nIFwiJXNcIicsIHRvLm5hbWUsIHRyYW5zcG9ydC5uYW1lKTtcbiAgICAgIGZyZWV6ZVRyYW5zcG9ydCgpO1xuICAgIH1cbiAgfVxuXG4gIC8vUmVtb3ZlIGFsbCBsaXN0ZW5lcnMgb24gdGhlIHRyYW5zcG9ydCBhbmQgb24gc2VsZlxuICBmdW5jdGlvbiBjbGVhbnVwKCl7XG4gICAgdHJhbnNwb3J0LnJlbW92ZUxpc3RlbmVyKCdvcGVuJywgb25UcmFuc3BvcnRPcGVuKTtcbiAgICB0cmFuc3BvcnQucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25lcnJvcik7XG4gICAgdHJhbnNwb3J0LnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIG9uVHJhbnNwb3J0Q2xvc2UpO1xuICAgIHNlbGYucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgb25jbG9zZSk7XG4gICAgc2VsZi5yZW1vdmVMaXN0ZW5lcigndXBncmFkaW5nJywgb251cGdyYWRlKTtcbiAgfVxuXG4gIHRyYW5zcG9ydC5vbmNlKCdvcGVuJywgb25UcmFuc3BvcnRPcGVuKTtcbiAgdHJhbnNwb3J0Lm9uY2UoJ2Vycm9yJywgb25lcnJvcik7XG4gIHRyYW5zcG9ydC5vbmNlKCdjbG9zZScsIG9uVHJhbnNwb3J0Q2xvc2UpO1xuXG4gIHRoaXMub25jZSgnY2xvc2UnLCBvbmNsb3NlKTtcbiAgdGhpcy5vbmNlKCd1cGdyYWRpbmcnLCBvbnVwZ3JhZGUpO1xuXG4gIHRyYW5zcG9ydC5vcGVuKCk7XG5cbn07XG5cbi8qKlxuICogQ2FsbGVkIHdoZW4gY29ubmVjdGlvbiBpcyBkZWVtZWQgb3Blbi5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblNvY2tldC5wcm90b3R5cGUub25PcGVuID0gZnVuY3Rpb24gKCkge1xuICBkZWJ1Zygnc29ja2V0IG9wZW4nKTtcbiAgdGhpcy5yZWFkeVN0YXRlID0gJ29wZW4nO1xuICBTb2NrZXQucHJpb3JXZWJzb2NrZXRTdWNjZXNzID0gJ3dlYnNvY2tldCcgPT0gdGhpcy50cmFuc3BvcnQubmFtZTtcbiAgdGhpcy5lbWl0KCdvcGVuJyk7XG4gIHRoaXMuZmx1c2goKTtcblxuICAvLyB3ZSBjaGVjayBmb3IgYHJlYWR5U3RhdGVgIGluIGNhc2UgYW4gYG9wZW5gXG4gIC8vIGxpc3RlbmVyIGFscmVhZHkgY2xvc2VkIHRoZSBzb2NrZXRcbiAgaWYgKCdvcGVuJyA9PSB0aGlzLnJlYWR5U3RhdGUgJiYgdGhpcy51cGdyYWRlICYmIHRoaXMudHJhbnNwb3J0LnBhdXNlKSB7XG4gICAgZGVidWcoJ3N0YXJ0aW5nIHVwZ3JhZGUgcHJvYmVzJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLnVwZ3JhZGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdGhpcy5wcm9iZSh0aGlzLnVwZ3JhZGVzW2ldKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogSGFuZGxlcyBhIHBhY2tldC5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5Tb2NrZXQucHJvdG90eXBlLm9uUGFja2V0ID0gZnVuY3Rpb24gKHBhY2tldCkge1xuICBpZiAoJ29wZW5pbmcnID09IHRoaXMucmVhZHlTdGF0ZSB8fCAnb3BlbicgPT0gdGhpcy5yZWFkeVN0YXRlKSB7XG4gICAgZGVidWcoJ3NvY2tldCByZWNlaXZlOiB0eXBlIFwiJXNcIiwgZGF0YSBcIiVzXCInLCBwYWNrZXQudHlwZSwgcGFja2V0LmRhdGEpO1xuXG4gICAgdGhpcy5lbWl0KCdwYWNrZXQnLCBwYWNrZXQpO1xuXG4gICAgLy8gU29ja2V0IGlzIGxpdmUgLSBhbnkgcGFja2V0IGNvdW50c1xuICAgIHRoaXMuZW1pdCgnaGVhcnRiZWF0Jyk7XG5cbiAgICBzd2l0Y2ggKHBhY2tldC50eXBlKSB7XG4gICAgICBjYXNlICdvcGVuJzpcbiAgICAgICAgdGhpcy5vbkhhbmRzaGFrZShwYXJzZWpzb24ocGFja2V0LmRhdGEpKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3BvbmcnOlxuICAgICAgICB0aGlzLnNldFBpbmcoKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcignc2VydmVyIGVycm9yJyk7XG4gICAgICAgIGVyci5jb2RlID0gcGFja2V0LmRhdGE7XG4gICAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnbWVzc2FnZSc6XG4gICAgICAgIHRoaXMuZW1pdCgnZGF0YScsIHBhY2tldC5kYXRhKTtcbiAgICAgICAgdGhpcy5lbWl0KCdtZXNzYWdlJywgcGFja2V0LmRhdGEpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZGVidWcoJ3BhY2tldCByZWNlaXZlZCB3aXRoIHNvY2tldCByZWFkeVN0YXRlIFwiJXNcIicsIHRoaXMucmVhZHlTdGF0ZSk7XG4gIH1cbn07XG5cbi8qKlxuICogQ2FsbGVkIHVwb24gaGFuZHNoYWtlIGNvbXBsZXRpb24uXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGhhbmRzaGFrZSBvYmpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblNvY2tldC5wcm90b3R5cGUub25IYW5kc2hha2UgPSBmdW5jdGlvbiAoZGF0YSkge1xuICB0aGlzLmVtaXQoJ2hhbmRzaGFrZScsIGRhdGEpO1xuICB0aGlzLmlkID0gZGF0YS5zaWQ7XG4gIHRoaXMudHJhbnNwb3J0LnF1ZXJ5LnNpZCA9IGRhdGEuc2lkO1xuICB0aGlzLnVwZ3JhZGVzID0gdGhpcy5maWx0ZXJVcGdyYWRlcyhkYXRhLnVwZ3JhZGVzKTtcbiAgdGhpcy5waW5nSW50ZXJ2YWwgPSBkYXRhLnBpbmdJbnRlcnZhbDtcbiAgdGhpcy5waW5nVGltZW91dCA9IGRhdGEucGluZ1RpbWVvdXQ7XG4gIHRoaXMub25PcGVuKCk7XG4gIC8vIEluIGNhc2Ugb3BlbiBoYW5kbGVyIGNsb3NlcyBzb2NrZXRcbiAgaWYgICgnY2xvc2VkJyA9PSB0aGlzLnJlYWR5U3RhdGUpIHJldHVybjtcbiAgdGhpcy5zZXRQaW5nKCk7XG5cbiAgLy8gUHJvbG9uZyBsaXZlbmVzcyBvZiBzb2NrZXQgb24gaGVhcnRiZWF0XG4gIHRoaXMucmVtb3ZlTGlzdGVuZXIoJ2hlYXJ0YmVhdCcsIHRoaXMub25IZWFydGJlYXQpO1xuICB0aGlzLm9uKCdoZWFydGJlYXQnLCB0aGlzLm9uSGVhcnRiZWF0KTtcbn07XG5cbi8qKlxuICogUmVzZXRzIHBpbmcgdGltZW91dC5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5Tb2NrZXQucHJvdG90eXBlLm9uSGVhcnRiZWF0ID0gZnVuY3Rpb24gKHRpbWVvdXQpIHtcbiAgY2xlYXJUaW1lb3V0KHRoaXMucGluZ1RpbWVvdXRUaW1lcik7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5waW5nVGltZW91dFRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCdjbG9zZWQnID09IHNlbGYucmVhZHlTdGF0ZSkgcmV0dXJuO1xuICAgIHNlbGYub25DbG9zZSgncGluZyB0aW1lb3V0Jyk7XG4gIH0sIHRpbWVvdXQgfHwgKHNlbGYucGluZ0ludGVydmFsICsgc2VsZi5waW5nVGltZW91dCkpO1xufTtcblxuLyoqXG4gKiBQaW5ncyBzZXJ2ZXIgZXZlcnkgYHRoaXMucGluZ0ludGVydmFsYCBhbmQgZXhwZWN0cyByZXNwb25zZVxuICogd2l0aGluIGB0aGlzLnBpbmdUaW1lb3V0YCBvciBjbG9zZXMgY29ubmVjdGlvbi5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5Tb2NrZXQucHJvdG90eXBlLnNldFBpbmcgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgY2xlYXJUaW1lb3V0KHNlbGYucGluZ0ludGVydmFsVGltZXIpO1xuICBzZWxmLnBpbmdJbnRlcnZhbFRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgZGVidWcoJ3dyaXRpbmcgcGluZyBwYWNrZXQgLSBleHBlY3RpbmcgcG9uZyB3aXRoaW4gJXNtcycsIHNlbGYucGluZ1RpbWVvdXQpO1xuICAgIHNlbGYucGluZygpO1xuICAgIHNlbGYub25IZWFydGJlYXQoc2VsZi5waW5nVGltZW91dCk7XG4gIH0sIHNlbGYucGluZ0ludGVydmFsKTtcbn07XG5cbi8qKlxuKiBTZW5kcyBhIHBpbmcgcGFja2V0LlxuKlxuKiBAYXBpIHB1YmxpY1xuKi9cblxuU29ja2V0LnByb3RvdHlwZS5waW5nID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNlbmRQYWNrZXQoJ3BpbmcnKTtcbn07XG5cbi8qKlxuICogQ2FsbGVkIG9uIGBkcmFpbmAgZXZlbnRcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5Tb2NrZXQucHJvdG90eXBlLm9uRHJhaW4gPSBmdW5jdGlvbigpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnByZXZCdWZmZXJMZW47IGkrKykge1xuICAgIGlmICh0aGlzLmNhbGxiYWNrQnVmZmVyW2ldKSB7XG4gICAgICB0aGlzLmNhbGxiYWNrQnVmZmVyW2ldKCk7XG4gICAgfVxuICB9XG5cbiAgdGhpcy53cml0ZUJ1ZmZlci5zcGxpY2UoMCwgdGhpcy5wcmV2QnVmZmVyTGVuKTtcbiAgdGhpcy5jYWxsYmFja0J1ZmZlci5zcGxpY2UoMCwgdGhpcy5wcmV2QnVmZmVyTGVuKTtcblxuICAvLyBzZXR0aW5nIHByZXZCdWZmZXJMZW4gPSAwIGlzIHZlcnkgaW1wb3J0YW50XG4gIC8vIGZvciBleGFtcGxlLCB3aGVuIHVwZ3JhZGluZywgdXBncmFkZSBwYWNrZXQgaXMgc2VudCBvdmVyLFxuICAvLyBhbmQgYSBub256ZXJvIHByZXZCdWZmZXJMZW4gY291bGQgY2F1c2UgcHJvYmxlbXMgb24gYGRyYWluYFxuICB0aGlzLnByZXZCdWZmZXJMZW4gPSAwO1xuXG4gIGlmICh0aGlzLndyaXRlQnVmZmVyLmxlbmd0aCA9PSAwKSB7XG4gICAgdGhpcy5lbWl0KCdkcmFpbicpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuZmx1c2goKTtcbiAgfVxufTtcblxuLyoqXG4gKiBGbHVzaCB3cml0ZSBidWZmZXJzLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblNvY2tldC5wcm90b3R5cGUuZmx1c2ggPSBmdW5jdGlvbiAoKSB7XG4gIGlmICgnY2xvc2VkJyAhPSB0aGlzLnJlYWR5U3RhdGUgJiYgdGhpcy50cmFuc3BvcnQud3JpdGFibGUgJiZcbiAgICAhdGhpcy51cGdyYWRpbmcgJiYgdGhpcy53cml0ZUJ1ZmZlci5sZW5ndGgpIHtcbiAgICBkZWJ1ZygnZmx1c2hpbmcgJWQgcGFja2V0cyBpbiBzb2NrZXQnLCB0aGlzLndyaXRlQnVmZmVyLmxlbmd0aCk7XG4gICAgdGhpcy50cmFuc3BvcnQuc2VuZCh0aGlzLndyaXRlQnVmZmVyKTtcbiAgICAvLyBrZWVwIHRyYWNrIG9mIGN1cnJlbnQgbGVuZ3RoIG9mIHdyaXRlQnVmZmVyXG4gICAgLy8gc3BsaWNlIHdyaXRlQnVmZmVyIGFuZCBjYWxsYmFja0J1ZmZlciBvbiBgZHJhaW5gXG4gICAgdGhpcy5wcmV2QnVmZmVyTGVuID0gdGhpcy53cml0ZUJ1ZmZlci5sZW5ndGg7XG4gICAgdGhpcy5lbWl0KCdmbHVzaCcpO1xuICB9XG59O1xuXG4vKipcbiAqIFNlbmRzIGEgbWVzc2FnZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGZ1bmN0aW9uLlxuICogQHJldHVybiB7U29ja2V0fSBmb3IgY2hhaW5pbmcuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblNvY2tldC5wcm90b3R5cGUud3JpdGUgPVxuU29ja2V0LnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24gKG1zZywgZm4pIHtcbiAgdGhpcy5zZW5kUGFja2V0KCdtZXNzYWdlJywgbXNnLCBmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZW5kcyBhIHBhY2tldC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGFja2V0IHR5cGUuXG4gKiBAcGFyYW0ge1N0cmluZ30gZGF0YS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIGZ1bmN0aW9uLlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU29ja2V0LnByb3RvdHlwZS5zZW5kUGFja2V0ID0gZnVuY3Rpb24gKHR5cGUsIGRhdGEsIGZuKSB7XG4gIHZhciBwYWNrZXQgPSB7IHR5cGU6IHR5cGUsIGRhdGE6IGRhdGEgfTtcbiAgdGhpcy5lbWl0KCdwYWNrZXRDcmVhdGUnLCBwYWNrZXQpO1xuICB0aGlzLndyaXRlQnVmZmVyLnB1c2gocGFja2V0KTtcbiAgdGhpcy5jYWxsYmFja0J1ZmZlci5wdXNoKGZuKTtcbiAgdGhpcy5mbHVzaCgpO1xufTtcblxuLyoqXG4gKiBDbG9zZXMgdGhlIGNvbm5lY3Rpb24uXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuU29ja2V0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKCdvcGVuaW5nJyA9PSB0aGlzLnJlYWR5U3RhdGUgfHwgJ29wZW4nID09IHRoaXMucmVhZHlTdGF0ZSkge1xuICAgIHRoaXMub25DbG9zZSgnZm9yY2VkIGNsb3NlJyk7XG4gICAgZGVidWcoJ3NvY2tldCBjbG9zaW5nIC0gdGVsbGluZyB0cmFuc3BvcnQgdG8gY2xvc2UnKTtcbiAgICB0aGlzLnRyYW5zcG9ydC5jbG9zZSgpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENhbGxlZCB1cG9uIHRyYW5zcG9ydCBlcnJvclxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblNvY2tldC5wcm90b3R5cGUub25FcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgZGVidWcoJ3NvY2tldCBlcnJvciAlaicsIGVycik7XG4gIFNvY2tldC5wcmlvcldlYnNvY2tldFN1Y2Nlc3MgPSBmYWxzZTtcbiAgdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG4gIHRoaXMub25DbG9zZSgndHJhbnNwb3J0IGVycm9yJywgZXJyKTtcbn07XG5cbi8qKlxuICogQ2FsbGVkIHVwb24gdHJhbnNwb3J0IGNsb3NlLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblNvY2tldC5wcm90b3R5cGUub25DbG9zZSA9IGZ1bmN0aW9uIChyZWFzb24sIGRlc2MpIHtcbiAgaWYgKCdvcGVuaW5nJyA9PSB0aGlzLnJlYWR5U3RhdGUgfHwgJ29wZW4nID09IHRoaXMucmVhZHlTdGF0ZSkge1xuICAgIGRlYnVnKCdzb2NrZXQgY2xvc2Ugd2l0aCByZWFzb246IFwiJXNcIicsIHJlYXNvbik7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gY2xlYXIgdGltZXJzXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMucGluZ0ludGVydmFsVGltZXIpO1xuICAgIGNsZWFyVGltZW91dCh0aGlzLnBpbmdUaW1lb3V0VGltZXIpO1xuXG4gICAgLy8gY2xlYW4gYnVmZmVycyBpbiBuZXh0IHRpY2ssIHNvIGRldmVsb3BlcnMgY2FuIHN0aWxsXG4gICAgLy8gZ3JhYiB0aGUgYnVmZmVycyBvbiBgY2xvc2VgIGV2ZW50XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYud3JpdGVCdWZmZXIgPSBbXTtcbiAgICAgIHNlbGYuY2FsbGJhY2tCdWZmZXIgPSBbXTtcbiAgICAgIHNlbGYucHJldkJ1ZmZlckxlbiA9IDA7XG4gICAgfSwgMCk7XG5cbiAgICAvLyBzdG9wIGV2ZW50IGZyb20gZmlyaW5nIGFnYWluIGZvciB0cmFuc3BvcnRcbiAgICB0aGlzLnRyYW5zcG9ydC5yZW1vdmVBbGxMaXN0ZW5lcnMoJ2Nsb3NlJyk7XG5cbiAgICAvLyBlbnN1cmUgdHJhbnNwb3J0IHdvbid0IHN0YXkgb3BlblxuICAgIHRoaXMudHJhbnNwb3J0LmNsb3NlKCk7XG5cbiAgICAvLyBpZ25vcmUgZnVydGhlciB0cmFuc3BvcnQgY29tbXVuaWNhdGlvblxuICAgIHRoaXMudHJhbnNwb3J0LnJlbW92ZUFsbExpc3RlbmVycygpO1xuXG4gICAgLy8gc2V0IHJlYWR5IHN0YXRlXG4gICAgdGhpcy5yZWFkeVN0YXRlID0gJ2Nsb3NlZCc7XG5cbiAgICAvLyBjbGVhciBzZXNzaW9uIGlkXG4gICAgdGhpcy5pZCA9IG51bGw7XG5cbiAgICAvLyBlbWl0IGNsb3NlIGV2ZW50XG4gICAgdGhpcy5lbWl0KCdjbG9zZScsIHJlYXNvbiwgZGVzYyk7XG4gIH1cbn07XG5cbi8qKlxuICogRmlsdGVycyB1cGdyYWRlcywgcmV0dXJuaW5nIG9ubHkgdGhvc2UgbWF0Y2hpbmcgY2xpZW50IHRyYW5zcG9ydHMuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gc2VydmVyIHVwZ3JhZGVzXG4gKiBAYXBpIHByaXZhdGVcbiAqXG4gKi9cblxuU29ja2V0LnByb3RvdHlwZS5maWx0ZXJVcGdyYWRlcyA9IGZ1bmN0aW9uICh1cGdyYWRlcykge1xuICB2YXIgZmlsdGVyZWRVcGdyYWRlcyA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgaiA9IHVwZ3JhZGVzLmxlbmd0aDsgaTxqOyBpKyspIHtcbiAgICBpZiAofmluZGV4KHRoaXMudHJhbnNwb3J0cywgdXBncmFkZXNbaV0pKSBmaWx0ZXJlZFVwZ3JhZGVzLnB1c2godXBncmFkZXNbaV0pO1xuICB9XG4gIHJldHVybiBmaWx0ZXJlZFVwZ3JhZGVzO1xufTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIvKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIHBhcnNlciA9IHJlcXVpcmUoJ2VuZ2luZS5pby1wYXJzZXInKTtcbnZhciBFbWl0dGVyID0gcmVxdWlyZSgnZW1pdHRlcicpO1xuXG4vKipcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gVHJhbnNwb3J0O1xuXG4vKipcbiAqIFRyYW5zcG9ydCBhYnN0cmFjdCBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucy5cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIFRyYW5zcG9ydCAob3B0cykge1xuICB0aGlzLnBhdGggPSBvcHRzLnBhdGg7XG4gIHRoaXMuaG9zdG5hbWUgPSBvcHRzLmhvc3RuYW1lO1xuICB0aGlzLnBvcnQgPSBvcHRzLnBvcnQ7XG4gIHRoaXMuc2VjdXJlID0gb3B0cy5zZWN1cmU7XG4gIHRoaXMucXVlcnkgPSBvcHRzLnF1ZXJ5O1xuICB0aGlzLnRpbWVzdGFtcFBhcmFtID0gb3B0cy50aW1lc3RhbXBQYXJhbTtcbiAgdGhpcy50aW1lc3RhbXBSZXF1ZXN0cyA9IG9wdHMudGltZXN0YW1wUmVxdWVzdHM7XG4gIHRoaXMucmVhZHlTdGF0ZSA9ICcnO1xuICB0aGlzLmFnZW50ID0gb3B0cy5hZ2VudCB8fCBmYWxzZTtcbiAgdGhpcy5zb2NrZXQgPSBvcHRzLnNvY2tldDtcbn1cblxuLyoqXG4gKiBNaXggaW4gYEVtaXR0ZXJgLlxuICovXG5cbkVtaXR0ZXIoVHJhbnNwb3J0LnByb3RvdHlwZSk7XG5cbi8qKlxuICogQSBjb3VudGVyIHVzZWQgdG8gcHJldmVudCBjb2xsaXNpb25zIGluIHRoZSB0aW1lc3RhbXBzIHVzZWRcbiAqIGZvciBjYWNoZSBidXN0aW5nLlxuICovXG5cblRyYW5zcG9ydC50aW1lc3RhbXBzID0gMDtcblxuLyoqXG4gKiBFbWl0cyBhbiBlcnJvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtUcmFuc3BvcnR9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5UcmFuc3BvcnQucHJvdG90eXBlLm9uRXJyb3IgPSBmdW5jdGlvbiAobXNnLCBkZXNjKSB7XG4gIHZhciBlcnIgPSBuZXcgRXJyb3IobXNnKTtcbiAgZXJyLnR5cGUgPSAnVHJhbnNwb3J0RXJyb3InO1xuICBlcnIuZGVzY3JpcHRpb24gPSBkZXNjO1xuICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE9wZW5zIHRoZSB0cmFuc3BvcnQuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5UcmFuc3BvcnQucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XG4gIGlmICgnY2xvc2VkJyA9PSB0aGlzLnJlYWR5U3RhdGUgfHwgJycgPT0gdGhpcy5yZWFkeVN0YXRlKSB7XG4gICAgdGhpcy5yZWFkeVN0YXRlID0gJ29wZW5pbmcnO1xuICAgIHRoaXMuZG9PcGVuKCk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2xvc2VzIHRoZSB0cmFuc3BvcnQuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuVHJhbnNwb3J0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKCdvcGVuaW5nJyA9PSB0aGlzLnJlYWR5U3RhdGUgfHwgJ29wZW4nID09IHRoaXMucmVhZHlTdGF0ZSkge1xuICAgIHRoaXMuZG9DbG9zZSgpO1xuICAgIHRoaXMub25DbG9zZSgpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNlbmRzIG11bHRpcGxlIHBhY2tldHMuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gcGFja2V0c1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuVHJhbnNwb3J0LnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24ocGFja2V0cyl7XG4gIGlmICgnb3BlbicgPT0gdGhpcy5yZWFkeVN0YXRlKSB7XG4gICAgdGhpcy53cml0ZShwYWNrZXRzKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1RyYW5zcG9ydCBub3Qgb3BlbicpO1xuICB9XG59O1xuXG4vKipcbiAqIENhbGxlZCB1cG9uIG9wZW5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5UcmFuc3BvcnQucHJvdG90eXBlLm9uT3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5yZWFkeVN0YXRlID0gJ29wZW4nO1xuICB0aGlzLndyaXRhYmxlID0gdHJ1ZTtcbiAgdGhpcy5lbWl0KCdvcGVuJyk7XG59O1xuXG4vKipcbiAqIENhbGxlZCB3aXRoIGRhdGEuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGRhdGFcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblRyYW5zcG9ydC5wcm90b3R5cGUub25EYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgdGhpcy5vblBhY2tldChwYXJzZXIuZGVjb2RlUGFja2V0KGRhdGEsIHRoaXMuc29ja2V0LmJpbmFyeVR5cGUpKTtcbn07XG5cbi8qKlxuICogQ2FsbGVkIHdpdGggYSBkZWNvZGVkIHBhY2tldC5cbiAqL1xuXG5UcmFuc3BvcnQucHJvdG90eXBlLm9uUGFja2V0ID0gZnVuY3Rpb24gKHBhY2tldCkge1xuICB0aGlzLmVtaXQoJ3BhY2tldCcsIHBhY2tldCk7XG59O1xuXG4vKipcbiAqIENhbGxlZCB1cG9uIGNsb3NlLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblRyYW5zcG9ydC5wcm90b3R5cGUub25DbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5yZWFkeVN0YXRlID0gJ2Nsb3NlZCc7XG4gIHRoaXMuZW1pdCgnY2xvc2UnKTtcbn07XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXNcbiAqL1xuXG52YXIgWE1MSHR0cFJlcXVlc3QgPSByZXF1aXJlKCd4bWxodHRwcmVxdWVzdCcpO1xudmFyIFhIUiA9IHJlcXVpcmUoJy4vcG9sbGluZy14aHInKTtcbnZhciBKU09OUCA9IHJlcXVpcmUoJy4vcG9sbGluZy1qc29ucCcpO1xudmFyIHdlYnNvY2tldCA9IHJlcXVpcmUoJy4vd2Vic29ja2V0Jyk7XG5cbi8qKlxuICogRXhwb3J0IHRyYW5zcG9ydHMuXG4gKi9cblxuZXhwb3J0cy5wb2xsaW5nID0gcG9sbGluZztcbmV4cG9ydHMud2Vic29ja2V0ID0gd2Vic29ja2V0O1xuXG4vKipcbiAqIFBvbGxpbmcgdHJhbnNwb3J0IHBvbHltb3JwaGljIGNvbnN0cnVjdG9yLlxuICogRGVjaWRlcyBvbiB4aHIgdnMganNvbnAgYmFzZWQgb24gZmVhdHVyZSBkZXRlY3Rpb24uXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcG9sbGluZyhvcHRzKXtcbiAgdmFyIHhocjtcbiAgdmFyIHhkID0gZmFsc2U7XG5cbiAgaWYgKGdsb2JhbC5sb2NhdGlvbikge1xuICAgIHZhciBpc1NTTCA9ICdodHRwczonID09IGxvY2F0aW9uLnByb3RvY29sO1xuICAgIHZhciBwb3J0ID0gbG9jYXRpb24ucG9ydDtcblxuICAgIC8vIHNvbWUgdXNlciBhZ2VudHMgaGF2ZSBlbXB0eSBgbG9jYXRpb24ucG9ydGBcbiAgICBpZiAoIXBvcnQpIHtcbiAgICAgIHBvcnQgPSBpc1NTTCA/IDQ0MyA6IDgwO1xuICAgIH1cblxuICAgIHhkID0gb3B0cy5ob3N0bmFtZSAhPSBsb2NhdGlvbi5ob3N0bmFtZSB8fCBwb3J0ICE9IG9wdHMucG9ydDtcbiAgfVxuXG4gIG9wdHMueGRvbWFpbiA9IHhkO1xuICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3Qob3B0cyk7XG5cbiAgaWYgKCdvcGVuJyBpbiB4aHIgJiYgIW9wdHMuZm9yY2VKU09OUCkge1xuICAgIHJldHVybiBuZXcgWEhSKG9wdHMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgSlNPTlAob3B0cyk7XG4gIH1cbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5cbi8qKlxuICogTW9kdWxlIHJlcXVpcmVtZW50cy5cbiAqL1xuXG52YXIgUG9sbGluZyA9IHJlcXVpcmUoJy4vcG9sbGluZycpO1xudmFyIGluaGVyaXQgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG4vKipcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gSlNPTlBQb2xsaW5nO1xuXG4vKipcbiAqIENhY2hlZCByZWd1bGFyIGV4cHJlc3Npb25zLlxuICovXG5cbnZhciByTmV3bGluZSA9IC9cXG4vZztcbnZhciByRXNjYXBlZE5ld2xpbmUgPSAvXFxcXG4vZztcblxuLyoqXG4gKiBHbG9iYWwgSlNPTlAgY2FsbGJhY2tzLlxuICovXG5cbnZhciBjYWxsYmFja3M7XG5cbi8qKlxuICogQ2FsbGJhY2tzIGNvdW50LlxuICovXG5cbnZhciBpbmRleCA9IDA7XG5cbi8qKlxuICogTm9vcC5cbiAqL1xuXG5mdW5jdGlvbiBlbXB0eSAoKSB7IH1cblxuLyoqXG4gKiBKU09OUCBQb2xsaW5nIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBKU09OUFBvbGxpbmcgKG9wdHMpIHtcbiAgUG9sbGluZy5jYWxsKHRoaXMsIG9wdHMpO1xuXG4gIHRoaXMucXVlcnkgPSB0aGlzLnF1ZXJ5IHx8IHt9O1xuXG4gIC8vIGRlZmluZSBnbG9iYWwgY2FsbGJhY2tzIGFycmF5IGlmIG5vdCBwcmVzZW50XG4gIC8vIHdlIGRvIHRoaXMgaGVyZSAobGF6aWx5KSB0byBhdm9pZCB1bm5lZWRlZCBnbG9iYWwgcG9sbHV0aW9uXG4gIGlmICghY2FsbGJhY2tzKSB7XG4gICAgLy8gd2UgbmVlZCB0byBjb25zaWRlciBtdWx0aXBsZSBlbmdpbmVzIGluIHRoZSBzYW1lIHBhZ2VcbiAgICBpZiAoIWdsb2JhbC5fX19laW8pIGdsb2JhbC5fX19laW8gPSBbXTtcbiAgICBjYWxsYmFja3MgPSBnbG9iYWwuX19fZWlvO1xuICB9XG5cbiAgLy8gY2FsbGJhY2sgaWRlbnRpZmllclxuICB0aGlzLmluZGV4ID0gY2FsbGJhY2tzLmxlbmd0aDtcblxuICAvLyBhZGQgY2FsbGJhY2sgdG8ganNvbnAgZ2xvYmFsXG4gIHZhciBzZWxmID0gdGhpcztcbiAgY2FsbGJhY2tzLnB1c2goZnVuY3Rpb24gKG1zZykge1xuICAgIHNlbGYub25EYXRhKG1zZyk7XG4gIH0pO1xuXG4gIC8vIGFwcGVuZCB0byBxdWVyeSBzdHJpbmdcbiAgdGhpcy5xdWVyeS5qID0gdGhpcy5pbmRleDtcblxuICAvLyBwcmV2ZW50IHNwdXJpb3VzIGVycm9ycyBmcm9tIGJlaW5nIGVtaXR0ZWQgd2hlbiB0aGUgd2luZG93IGlzIHVubG9hZGVkXG4gIGlmIChnbG9iYWwuZG9jdW1lbnQgJiYgZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICBnbG9iYWwuYWRkRXZlbnRMaXN0ZW5lcignYmVmb3JldW5sb2FkJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuc2NyaXB0KSBzZWxmLnNjcmlwdC5vbmVycm9yID0gZW1wdHk7XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBJbmhlcml0cyBmcm9tIFBvbGxpbmcuXG4gKi9cblxuaW5oZXJpdChKU09OUFBvbGxpbmcsIFBvbGxpbmcpO1xuXG4vKlxuICogSlNPTlAgb25seSBzdXBwb3J0cyBiaW5hcnkgYXMgYmFzZTY0IGVuY29kZWQgc3RyaW5nc1xuICovXG5cbkpTT05QUG9sbGluZy5wcm90b3R5cGUuc3VwcG9ydHNCaW5hcnkgPSBmYWxzZTtcblxuLyoqXG4gKiBDbG9zZXMgdGhlIHNvY2tldC5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5KU09OUFBvbGxpbmcucHJvdG90eXBlLmRvQ2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLnNjcmlwdCkge1xuICAgIHRoaXMuc2NyaXB0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5zY3JpcHQpO1xuICAgIHRoaXMuc2NyaXB0ID0gbnVsbDtcbiAgfVxuXG4gIGlmICh0aGlzLmZvcm0pIHtcbiAgICB0aGlzLmZvcm0ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmZvcm0pO1xuICAgIHRoaXMuZm9ybSA9IG51bGw7XG4gIH1cblxuICBQb2xsaW5nLnByb3RvdHlwZS5kb0Nsb3NlLmNhbGwodGhpcyk7XG59O1xuXG4vKipcbiAqIFN0YXJ0cyBhIHBvbGwgY3ljbGUuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuSlNPTlBQb2xsaW5nLnByb3RvdHlwZS5kb1BvbGwgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuXG4gIGlmICh0aGlzLnNjcmlwdCkge1xuICAgIHRoaXMuc2NyaXB0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5zY3JpcHQpO1xuICAgIHRoaXMuc2NyaXB0ID0gbnVsbDtcbiAgfVxuXG4gIHNjcmlwdC5hc3luYyA9IHRydWU7XG4gIHNjcmlwdC5zcmMgPSB0aGlzLnVyaSgpO1xuICBzY3JpcHQub25lcnJvciA9IGZ1bmN0aW9uKGUpe1xuICAgIHNlbGYub25FcnJvcignanNvbnAgcG9sbCBlcnJvcicsZSk7XG4gIH07XG5cbiAgdmFyIGluc2VydEF0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpWzBdO1xuICBpbnNlcnRBdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzY3JpcHQsIGluc2VydEF0KTtcbiAgdGhpcy5zY3JpcHQgPSBzY3JpcHQ7XG5cbiAgdmFyIGlzVUFnZWNrbyA9ICd1bmRlZmluZWQnICE9IHR5cGVvZiBuYXZpZ2F0b3IgJiYgL2dlY2tvL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcbiAgXG4gIGlmIChpc1VBZ2Vja28pIHtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBpZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoaWZyYW1lKTtcbiAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoaWZyYW1lKTtcbiAgICB9LCAxMDApO1xuICB9XG59O1xuXG4vKipcbiAqIFdyaXRlcyB3aXRoIGEgaGlkZGVuIGlmcmFtZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZGF0YSB0byBzZW5kXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsZWQgdXBvbiBmbHVzaC5cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbkpTT05QUG9sbGluZy5wcm90b3R5cGUuZG9Xcml0ZSA9IGZ1bmN0aW9uIChkYXRhLCBmbikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKCF0aGlzLmZvcm0pIHtcbiAgICB2YXIgZm9ybSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2Zvcm0nKTtcbiAgICB2YXIgYXJlYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RleHRhcmVhJyk7XG4gICAgdmFyIGlkID0gdGhpcy5pZnJhbWVJZCA9ICdlaW9faWZyYW1lXycgKyB0aGlzLmluZGV4O1xuICAgIHZhciBpZnJhbWU7XG5cbiAgICBmb3JtLmNsYXNzTmFtZSA9ICdzb2NrZXRpbyc7XG4gICAgZm9ybS5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgZm9ybS5zdHlsZS50b3AgPSAnLTEwMDBweCc7XG4gICAgZm9ybS5zdHlsZS5sZWZ0ID0gJy0xMDAwcHgnO1xuICAgIGZvcm0udGFyZ2V0ID0gaWQ7XG4gICAgZm9ybS5tZXRob2QgPSAnUE9TVCc7XG4gICAgZm9ybS5zZXRBdHRyaWJ1dGUoJ2FjY2VwdC1jaGFyc2V0JywgJ3V0Zi04Jyk7XG4gICAgYXJlYS5uYW1lID0gJ2QnO1xuICAgIGZvcm0uYXBwZW5kQ2hpbGQoYXJlYSk7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChmb3JtKTtcblxuICAgIHRoaXMuZm9ybSA9IGZvcm07XG4gICAgdGhpcy5hcmVhID0gYXJlYTtcbiAgfVxuXG4gIHRoaXMuZm9ybS5hY3Rpb24gPSB0aGlzLnVyaSgpO1xuXG4gIGZ1bmN0aW9uIGNvbXBsZXRlICgpIHtcbiAgICBpbml0SWZyYW1lKCk7XG4gICAgZm4oKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGluaXRJZnJhbWUgKCkge1xuICAgIGlmIChzZWxmLmlmcmFtZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgc2VsZi5mb3JtLnJlbW92ZUNoaWxkKHNlbGYuaWZyYW1lKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgc2VsZi5vbkVycm9yKCdqc29ucCBwb2xsaW5nIGlmcmFtZSByZW1vdmFsIGVycm9yJywgZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIC8vIGllNiBkeW5hbWljIGlmcmFtZXMgd2l0aCB0YXJnZXQ9XCJcIiBzdXBwb3J0ICh0aGFua3MgQ2hyaXMgTGFtYmFjaGVyKVxuICAgICAgdmFyIGh0bWwgPSAnPGlmcmFtZSBzcmM9XCJqYXZhc2NyaXB0OjBcIiBuYW1lPVwiJysgc2VsZi5pZnJhbWVJZCArJ1wiPic7XG4gICAgICBpZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGh0bWwpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICAgICAgaWZyYW1lLm5hbWUgPSBzZWxmLmlmcmFtZUlkO1xuICAgICAgaWZyYW1lLnNyYyA9ICdqYXZhc2NyaXB0OjAnO1xuICAgIH1cblxuICAgIGlmcmFtZS5pZCA9IHNlbGYuaWZyYW1lSWQ7XG5cbiAgICBzZWxmLmZvcm0uYXBwZW5kQ2hpbGQoaWZyYW1lKTtcbiAgICBzZWxmLmlmcmFtZSA9IGlmcmFtZTtcbiAgfVxuXG4gIGluaXRJZnJhbWUoKTtcblxuICAvLyBlc2NhcGUgXFxuIHRvIHByZXZlbnQgaXQgZnJvbSBiZWluZyBjb252ZXJ0ZWQgaW50byBcXHJcXG4gYnkgc29tZSBVQXNcbiAgLy8gZG91YmxlIGVzY2FwaW5nIGlzIHJlcXVpcmVkIGZvciBlc2NhcGVkIG5ldyBsaW5lcyBiZWNhdXNlIHVuZXNjYXBpbmcgb2YgbmV3IGxpbmVzIGNhbiBiZSBkb25lIHNhZmVseSBvbiBzZXJ2ZXItc2lkZVxuICBkYXRhID0gZGF0YS5yZXBsYWNlKHJFc2NhcGVkTmV3bGluZSwgJ1xcXFxcXG4nKTtcbiAgdGhpcy5hcmVhLnZhbHVlID0gZGF0YS5yZXBsYWNlKHJOZXdsaW5lLCAnXFxcXG4nKTtcblxuICB0cnkge1xuICAgIHRoaXMuZm9ybS5zdWJtaXQoKTtcbiAgfSBjYXRjaChlKSB7fVxuXG4gIGlmICh0aGlzLmlmcmFtZS5hdHRhY2hFdmVudCkge1xuICAgIHRoaXMuaWZyYW1lLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCl7XG4gICAgICBpZiAoc2VsZi5pZnJhbWUucmVhZHlTdGF0ZSA9PSAnY29tcGxldGUnKSB7XG4gICAgICAgIGNvbXBsZXRlKCk7XG4gICAgICB9XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmlmcmFtZS5vbmxvYWQgPSBjb21wbGV0ZTtcbiAgfVxufTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4vKipcbiAqIE1vZHVsZSByZXF1aXJlbWVudHMuXG4gKi9cblxudmFyIFhNTEh0dHBSZXF1ZXN0ID0gcmVxdWlyZSgneG1saHR0cHJlcXVlc3QnKTtcbnZhciBQb2xsaW5nID0gcmVxdWlyZSgnLi9wb2xsaW5nJyk7XG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJ2VtaXR0ZXInKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2VuZ2luZS5pby1jbGllbnQ6cG9sbGluZy14aHInKTtcbnZhciBpbmhlcml0ID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuLyoqXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhIUjtcbm1vZHVsZS5leHBvcnRzLlJlcXVlc3QgPSBSZXF1ZXN0O1xuXG4vKipcbiAqIEVtcHR5IGZ1bmN0aW9uXG4gKi9cblxuZnVuY3Rpb24gZW1wdHkoKXt9XG5cbi8qKlxuICogWEhSIFBvbGxpbmcgY29uc3RydWN0b3IuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gWEhSKG9wdHMpe1xuICBQb2xsaW5nLmNhbGwodGhpcywgb3B0cyk7XG5cbiAgaWYgKGdsb2JhbC5sb2NhdGlvbikge1xuICAgIHZhciBpc1NTTCA9ICdodHRwczonID09IGxvY2F0aW9uLnByb3RvY29sO1xuICAgIHZhciBwb3J0ID0gbG9jYXRpb24ucG9ydDtcblxuICAgIC8vIHNvbWUgdXNlciBhZ2VudHMgaGF2ZSBlbXB0eSBgbG9jYXRpb24ucG9ydGBcbiAgICBpZiAoIXBvcnQpIHtcbiAgICAgIHBvcnQgPSBpc1NTTCA/IDQ0MyA6IDgwO1xuICAgIH1cblxuICAgIHRoaXMueGQgPSBvcHRzLmhvc3RuYW1lICE9IGdsb2JhbC5sb2NhdGlvbi5ob3N0bmFtZSB8fFxuICAgICAgcG9ydCAhPSBvcHRzLnBvcnQ7XG4gIH1cbn1cblxuLyoqXG4gKiBJbmhlcml0cyBmcm9tIFBvbGxpbmcuXG4gKi9cblxuaW5oZXJpdChYSFIsIFBvbGxpbmcpO1xuXG4vKipcbiAqIFhIUiBzdXBwb3J0cyBiaW5hcnlcbiAqL1xuXG5YSFIucHJvdG90eXBlLnN1cHBvcnRzQmluYXJ5ID0gdHJ1ZTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgcmVxdWVzdC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5YSFIucHJvdG90eXBlLnJlcXVlc3QgPSBmdW5jdGlvbihvcHRzKXtcbiAgb3B0cyA9IG9wdHMgfHwge307XG4gIG9wdHMudXJpID0gdGhpcy51cmkoKTtcbiAgb3B0cy54ZCA9IHRoaXMueGQ7XG4gIG9wdHMuYWdlbnQgPSB0aGlzLmFnZW50IHx8IGZhbHNlO1xuICBvcHRzLnN1cHBvcnRzQmluYXJ5ID0gdGhpcy5zdXBwb3J0c0JpbmFyeTtcbiAgcmV0dXJuIG5ldyBSZXF1ZXN0KG9wdHMpO1xufTtcblxuLyoqXG4gKiBTZW5kcyBkYXRhLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBkYXRhIHRvIHNlbmQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsZWQgdXBvbiBmbHVzaC5cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblhIUi5wcm90b3R5cGUuZG9Xcml0ZSA9IGZ1bmN0aW9uKGRhdGEsIGZuKXtcbiAgdmFyIGlzQmluYXJ5ID0gdHlwZW9mIGRhdGEgIT09ICdzdHJpbmcnICYmIGRhdGEgIT09IHVuZGVmaW5lZDtcbiAgdmFyIHJlcSA9IHRoaXMucmVxdWVzdCh7IG1ldGhvZDogJ1BPU1QnLCBkYXRhOiBkYXRhLCBpc0JpbmFyeTogaXNCaW5hcnkgfSk7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmVxLm9uKCdzdWNjZXNzJywgZm4pO1xuICByZXEub24oJ2Vycm9yJywgZnVuY3Rpb24oZXJyKXtcbiAgICBzZWxmLm9uRXJyb3IoJ3hociBwb3N0IGVycm9yJywgZXJyKTtcbiAgfSk7XG4gIHRoaXMuc2VuZFhociA9IHJlcTtcbn07XG5cbi8qKlxuICogU3RhcnRzIGEgcG9sbCBjeWNsZS5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5YSFIucHJvdG90eXBlLmRvUG9sbCA9IGZ1bmN0aW9uKCl7XG4gIGRlYnVnKCd4aHIgcG9sbCcpO1xuICB2YXIgcmVxID0gdGhpcy5yZXF1ZXN0KCk7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmVxLm9uKCdkYXRhJywgZnVuY3Rpb24oZGF0YSl7XG4gICAgc2VsZi5vbkRhdGEoZGF0YSk7XG4gIH0pO1xuICByZXEub24oJ2Vycm9yJywgZnVuY3Rpb24oZXJyKXtcbiAgICBzZWxmLm9uRXJyb3IoJ3hociBwb2xsIGVycm9yJywgZXJyKTtcbiAgfSk7XG4gIHRoaXMucG9sbFhociA9IHJlcTtcbn07XG5cbi8qKlxuICogUmVxdWVzdCBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFJlcXVlc3Qob3B0cyl7XG4gIHRoaXMubWV0aG9kID0gb3B0cy5tZXRob2QgfHwgJ0dFVCc7XG4gIHRoaXMudXJpID0gb3B0cy51cmk7XG4gIHRoaXMueGQgPSAhIW9wdHMueGQ7XG4gIHRoaXMuYXN5bmMgPSBmYWxzZSAhPT0gb3B0cy5hc3luYztcbiAgdGhpcy5kYXRhID0gdW5kZWZpbmVkICE9IG9wdHMuZGF0YSA/IG9wdHMuZGF0YSA6IG51bGw7XG4gIHRoaXMuYWdlbnQgPSBvcHRzLmFnZW50O1xuICB0aGlzLmNyZWF0ZShvcHRzLmlzQmluYXJ5LCBvcHRzLnN1cHBvcnRzQmluYXJ5KTtcbn1cblxuLyoqXG4gKiBNaXggaW4gYEVtaXR0ZXJgLlxuICovXG5cbkVtaXR0ZXIoUmVxdWVzdC5wcm90b3R5cGUpO1xuXG4vKipcbiAqIENyZWF0ZXMgdGhlIFhIUiBvYmplY3QgYW5kIHNlbmRzIHRoZSByZXF1ZXN0LlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uKGlzQmluYXJ5LCBzdXBwb3J0c0JpbmFyeSl7XG4gIHZhciB4aHIgPSB0aGlzLnhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCh7IGFnZW50OiB0aGlzLmFnZW50LCB4ZG9tYWluOiB0aGlzLnhkIH0pO1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdHJ5IHtcbiAgICBkZWJ1ZygneGhyIG9wZW4gJXM6ICVzJywgdGhpcy5tZXRob2QsIHRoaXMudXJpKTtcbiAgICB4aHIub3Blbih0aGlzLm1ldGhvZCwgdGhpcy51cmksIHRoaXMuYXN5bmMpO1xuICAgIGlmIChzdXBwb3J0c0JpbmFyeSkge1xuICAgICAgLy8gVGhpcyBoYXMgdG8gYmUgZG9uZSBhZnRlciBvcGVuIGJlY2F1c2UgRmlyZWZveCBpcyBzdHVwaWRcbiAgICAgIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTMyMTY5MDMvZ2V0LWJpbmFyeS1kYXRhLXdpdGgteG1saHR0cHJlcXVlc3QtaW4tYS1maXJlZm94LWV4dGVuc2lvblxuICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgfVxuXG4gICAgaWYgKCdQT1NUJyA9PSB0aGlzLm1ldGhvZCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGlzQmluYXJ5KSB7XG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtdHlwZScsICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC10eXBlJywgJ3RleHQvcGxhaW47Y2hhcnNldD1VVEYtOCcpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7fVxuICAgIH1cblxuICAgIC8vIGllNiBjaGVja1xuICAgIGlmICgnd2l0aENyZWRlbnRpYWxzJyBpbiB4aHIpIHtcbiAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuICAgIH1cblxuICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpe1xuICAgICAgdmFyIGRhdGE7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICg0ICE9IHhoci5yZWFkeVN0YXRlKSByZXR1cm47XG4gICAgICAgIGlmICgyMDAgPT0geGhyLnN0YXR1cyB8fCAxMjIzID09IHhoci5zdGF0dXMpIHtcbiAgICAgICAgICB2YXIgY29udGVudFR5cGUgPSB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ0NvbnRlbnQtVHlwZScpO1xuICAgICAgICAgIGlmIChjb250ZW50VHlwZSA9PT0gJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScpIHtcbiAgICAgICAgICAgIGRhdGEgPSB4aHIucmVzcG9uc2U7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghc3VwcG9ydHNCaW5hcnkpIHtcbiAgICAgICAgICAgICAgZGF0YSA9IHhoci5yZXNwb25zZVRleHQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBkYXRhID0gJ29rJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gbWFrZSBzdXJlIHRoZSBgZXJyb3JgIGV2ZW50IGhhbmRsZXIgdGhhdCdzIHVzZXItc2V0XG4gICAgICAgICAgLy8gZG9lcyBub3QgdGhyb3cgaW4gdGhlIHNhbWUgdGljayBhbmQgZ2V0cyBjYXVnaHQgaGVyZVxuICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYub25FcnJvcih4aHIuc3RhdHVzKTtcbiAgICAgICAgICB9LCAwKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBzZWxmLm9uRXJyb3IoZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChudWxsICE9IGRhdGEpIHtcbiAgICAgICAgc2VsZi5vbkRhdGEoZGF0YSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGRlYnVnKCd4aHIgZGF0YSAlcycsIHRoaXMuZGF0YSk7XG4gICAgeGhyLnNlbmQodGhpcy5kYXRhKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIE5lZWQgdG8gZGVmZXIgc2luY2UgLmNyZWF0ZSgpIGlzIGNhbGxlZCBkaXJlY3RseSBmaHJvbSB0aGUgY29uc3RydWN0b3JcbiAgICAvLyBhbmQgdGh1cyB0aGUgJ2Vycm9yJyBldmVudCBjYW4gb25seSBiZSBvbmx5IGJvdW5kICphZnRlciogdGhpcyBleGNlcHRpb25cbiAgICAvLyBvY2N1cnMuICBUaGVyZWZvcmUsIGFsc28sIHdlIGNhbm5vdCB0aHJvdyBoZXJlIGF0IGFsbC5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5vbkVycm9yKGUpO1xuICAgIH0sIDApO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChnbG9iYWwuZG9jdW1lbnQpIHtcbiAgICB0aGlzLmluZGV4ID0gUmVxdWVzdC5yZXF1ZXN0c0NvdW50Kys7XG4gICAgUmVxdWVzdC5yZXF1ZXN0c1t0aGlzLmluZGV4XSA9IHRoaXM7XG4gIH1cbn07XG5cbi8qKlxuICogQ2FsbGVkIHVwb24gc3VjY2Vzc2Z1bCByZXNwb25zZS5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5vblN1Y2Nlc3MgPSBmdW5jdGlvbigpe1xuICB0aGlzLmVtaXQoJ3N1Y2Nlc3MnKTtcbiAgdGhpcy5jbGVhbnVwKCk7XG59O1xuXG4vKipcbiAqIENhbGxlZCBpZiB3ZSBoYXZlIGRhdGEuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUub25EYXRhID0gZnVuY3Rpb24oZGF0YSl7XG4gIHRoaXMuZW1pdCgnZGF0YScsIGRhdGEpO1xuICB0aGlzLm9uU3VjY2VzcygpO1xufTtcblxuLyoqXG4gKiBDYWxsZWQgdXBvbiBlcnJvci5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5vbkVycm9yID0gZnVuY3Rpb24oZXJyKXtcbiAgdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG4gIHRoaXMuY2xlYW51cCgpO1xufTtcblxuLyoqXG4gKiBDbGVhbnMgdXAgaG91c2UuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuY2xlYW51cCA9IGZ1bmN0aW9uKCl7XG4gIGlmICgndW5kZWZpbmVkJyA9PSB0eXBlb2YgdGhpcy54aHIgfHwgbnVsbCA9PT0gdGhpcy54aHIpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgLy8geG1saHR0cHJlcXVlc3RcbiAgdGhpcy54aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZW1wdHk7XG5cbiAgdHJ5IHtcbiAgICB0aGlzLnhoci5hYm9ydCgpO1xuICB9IGNhdGNoKGUpIHt9XG5cbiAgaWYgKGdsb2JhbC5kb2N1bWVudCkge1xuICAgIGRlbGV0ZSBSZXF1ZXN0LnJlcXVlc3RzW3RoaXMuaW5kZXhdO1xuICB9XG5cbiAgdGhpcy54aHIgPSBudWxsO1xufTtcblxuLyoqXG4gKiBBYm9ydHMgdGhlIHJlcXVlc3QuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uKCl7XG4gIHRoaXMuY2xlYW51cCgpO1xufTtcblxuLyoqXG4gKiBBYm9ydHMgcGVuZGluZyByZXF1ZXN0cyB3aGVuIHVubG9hZGluZyB0aGUgd2luZG93LiBUaGlzIGlzIG5lZWRlZCB0byBwcmV2ZW50XG4gKiBtZW1vcnkgbGVha3MgKGUuZy4gd2hlbiB1c2luZyBJRSkgYW5kIHRvIGVuc3VyZSB0aGF0IG5vIHNwdXJpb3VzIGVycm9yIGlzXG4gKiBlbWl0dGVkLlxuICovXG5cbmlmIChnbG9iYWwuZG9jdW1lbnQpIHtcbiAgUmVxdWVzdC5yZXF1ZXN0c0NvdW50ID0gMDtcbiAgUmVxdWVzdC5yZXF1ZXN0cyA9IHt9O1xuICBpZiAoZ2xvYmFsLmF0dGFjaEV2ZW50KSB7XG4gICAgZ2xvYmFsLmF0dGFjaEV2ZW50KCdvbnVubG9hZCcsIHVubG9hZEhhbmRsZXIpO1xuICB9IGVsc2UgaWYgKGdsb2JhbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXIoJ2JlZm9yZXVubG9hZCcsIHVubG9hZEhhbmRsZXIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVubG9hZEhhbmRsZXIoKSB7XG4gIGZvciAodmFyIGkgaW4gUmVxdWVzdC5yZXF1ZXN0cykge1xuICAgIGlmIChSZXF1ZXN0LnJlcXVlc3RzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICBSZXF1ZXN0LnJlcXVlc3RzW2ldLmFib3J0KCk7XG4gICAgfVxuICB9XG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBUcmFuc3BvcnQgPSByZXF1aXJlKCcuLi90cmFuc3BvcnQnKTtcbnZhciBwYXJzZXFzID0gcmVxdWlyZSgncGFyc2VxcycpO1xudmFyIHBhcnNlciA9IHJlcXVpcmUoJ2VuZ2luZS5pby1wYXJzZXInKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2VuZ2luZS5pby1jbGllbnQ6cG9sbGluZycpO1xudmFyIGluaGVyaXQgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG4vKipcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gUG9sbGluZztcblxuLyoqXG4gKiBJcyBYSFIyIHN1cHBvcnRlZD9cbiAqL1xuXG52YXIgaGFzWEhSMiA9IChmdW5jdGlvbigpIHtcbiAgdmFyIFhNTEh0dHBSZXF1ZXN0ID0gcmVxdWlyZSgneG1saHR0cHJlcXVlc3QnKTtcbiAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCh7IGFnZW50OiB0aGlzLmFnZW50LCB4ZG9tYWluOiBmYWxzZSB9KTtcbiAgcmV0dXJuIG51bGwgIT0geGhyLnJlc3BvbnNlVHlwZTtcbn0pKCk7XG5cbi8qKlxuICogUG9sbGluZyBpbnRlcmZhY2UuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHNcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIFBvbGxpbmcob3B0cyl7XG4gIHZhciBmb3JjZUJhc2U2NCA9IChvcHRzICYmIG9wdHMuZm9yY2VCYXNlNjQpO1xuICBpZiAoIWhhc1hIUjIgfHwgZm9yY2VCYXNlNjQpIHtcbiAgICB0aGlzLnN1cHBvcnRzQmluYXJ5ID0gZmFsc2U7XG4gIH1cbiAgVHJhbnNwb3J0LmNhbGwodGhpcywgb3B0cyk7XG59XG5cbi8qKlxuICogSW5oZXJpdHMgZnJvbSBUcmFuc3BvcnQuXG4gKi9cblxuaW5oZXJpdChQb2xsaW5nLCBUcmFuc3BvcnQpO1xuXG4vKipcbiAqIFRyYW5zcG9ydCBuYW1lLlxuICovXG5cblBvbGxpbmcucHJvdG90eXBlLm5hbWUgPSAncG9sbGluZyc7XG5cbi8qKlxuICogT3BlbnMgdGhlIHNvY2tldCAodHJpZ2dlcnMgcG9sbGluZykuIFdlIHdyaXRlIGEgUElORyBtZXNzYWdlIHRvIGRldGVybWluZVxuICogd2hlbiB0aGUgdHJhbnNwb3J0IGlzIG9wZW4uXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUG9sbGluZy5wcm90b3R5cGUuZG9PcGVuID0gZnVuY3Rpb24oKXtcbiAgdGhpcy5wb2xsKCk7XG59O1xuXG4vKipcbiAqIFBhdXNlcyBwb2xsaW5nLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIHVwb24gYnVmZmVycyBhcmUgZmx1c2hlZCBhbmQgdHJhbnNwb3J0IGlzIHBhdXNlZFxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUG9sbGluZy5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbihvblBhdXNlKXtcbiAgdmFyIHBlbmRpbmcgPSAwO1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdGhpcy5yZWFkeVN0YXRlID0gJ3BhdXNpbmcnO1xuXG4gIGZ1bmN0aW9uIHBhdXNlKCl7XG4gICAgZGVidWcoJ3BhdXNlZCcpO1xuICAgIHNlbGYucmVhZHlTdGF0ZSA9ICdwYXVzZWQnO1xuICAgIG9uUGF1c2UoKTtcbiAgfVxuXG4gIGlmICh0aGlzLnBvbGxpbmcgfHwgIXRoaXMud3JpdGFibGUpIHtcbiAgICB2YXIgdG90YWwgPSAwO1xuXG4gICAgaWYgKHRoaXMucG9sbGluZykge1xuICAgICAgZGVidWcoJ3dlIGFyZSBjdXJyZW50bHkgcG9sbGluZyAtIHdhaXRpbmcgdG8gcGF1c2UnKTtcbiAgICAgIHRvdGFsKys7XG4gICAgICB0aGlzLm9uY2UoJ3BvbGxDb21wbGV0ZScsIGZ1bmN0aW9uKCl7XG4gICAgICAgIGRlYnVnKCdwcmUtcGF1c2UgcG9sbGluZyBjb21wbGV0ZScpO1xuICAgICAgICAtLXRvdGFsIHx8IHBhdXNlKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMud3JpdGFibGUpIHtcbiAgICAgIGRlYnVnKCd3ZSBhcmUgY3VycmVudGx5IHdyaXRpbmcgLSB3YWl0aW5nIHRvIHBhdXNlJyk7XG4gICAgICB0b3RhbCsrO1xuICAgICAgdGhpcy5vbmNlKCdkcmFpbicsIGZ1bmN0aW9uKCl7XG4gICAgICAgIGRlYnVnKCdwcmUtcGF1c2Ugd3JpdGluZyBjb21wbGV0ZScpO1xuICAgICAgICAtLXRvdGFsIHx8IHBhdXNlKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcGF1c2UoKTtcbiAgfVxufTtcblxuLyoqXG4gKiBTdGFydHMgcG9sbGluZyBjeWNsZS5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblBvbGxpbmcucHJvdG90eXBlLnBvbGwgPSBmdW5jdGlvbigpe1xuICBkZWJ1ZygncG9sbGluZycpO1xuICB0aGlzLnBvbGxpbmcgPSB0cnVlO1xuICB0aGlzLmRvUG9sbCgpO1xuICB0aGlzLmVtaXQoJ3BvbGwnKTtcbn07XG5cbi8qKlxuICogT3ZlcmxvYWRzIG9uRGF0YSB0byBkZXRlY3QgcGF5bG9hZHMuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUG9sbGluZy5wcm90b3R5cGUub25EYXRhID0gZnVuY3Rpb24oZGF0YSl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgZGVidWcoJ3BvbGxpbmcgZ290IGRhdGEgJXMnLCBkYXRhKTtcbiAgdmFyIGNhbGxiYWNrID0gZnVuY3Rpb24ocGFja2V0LCBpbmRleCwgdG90YWwpIHtcbiAgICAvLyBpZiBpdHMgdGhlIGZpcnN0IG1lc3NhZ2Ugd2UgY29uc2lkZXIgdGhlIHRyYW5zcG9ydCBvcGVuXG4gICAgaWYgKCdvcGVuaW5nJyA9PSBzZWxmLnJlYWR5U3RhdGUpIHtcbiAgICAgIHNlbGYub25PcGVuKCk7XG4gICAgfVxuXG4gICAgLy8gaWYgaXRzIGEgY2xvc2UgcGFja2V0LCB3ZSBjbG9zZSB0aGUgb25nb2luZyByZXF1ZXN0c1xuICAgIGlmICgnY2xvc2UnID09IHBhY2tldC50eXBlKSB7XG4gICAgICBzZWxmLm9uQ2xvc2UoKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBvdGhlcndpc2UgYnlwYXNzIG9uRGF0YSBhbmQgaGFuZGxlIHRoZSBtZXNzYWdlXG4gICAgc2VsZi5vblBhY2tldChwYWNrZXQpO1xuICB9O1xuXG4gIC8vIGRlY29kZSBwYXlsb2FkXG4gIHBhcnNlci5kZWNvZGVQYXlsb2FkKGRhdGEsIHRoaXMuc29ja2V0LmJpbmFyeVR5cGUsIGNhbGxiYWNrKTtcblxuICAvLyBpZiBhbiBldmVudCBkaWQgbm90IHRyaWdnZXIgY2xvc2luZ1xuICBpZiAoJ2Nsb3NlZCcgIT0gdGhpcy5yZWFkeVN0YXRlKSB7XG4gICAgLy8gaWYgd2UgZ290IGRhdGEgd2UncmUgbm90IHBvbGxpbmdcbiAgICB0aGlzLnBvbGxpbmcgPSBmYWxzZTtcbiAgICB0aGlzLmVtaXQoJ3BvbGxDb21wbGV0ZScpO1xuXG4gICAgaWYgKCdvcGVuJyA9PSB0aGlzLnJlYWR5U3RhdGUpIHtcbiAgICAgIHRoaXMucG9sbCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1ZygnaWdub3JpbmcgcG9sbCAtIHRyYW5zcG9ydCBzdGF0ZSBcIiVzXCInLCB0aGlzLnJlYWR5U3RhdGUpO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBGb3IgcG9sbGluZywgc2VuZCBhIGNsb3NlIHBhY2tldC5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5Qb2xsaW5nLnByb3RvdHlwZS5kb0Nsb3NlID0gZnVuY3Rpb24oKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGZ1bmN0aW9uIGNsb3NlKCl7XG4gICAgZGVidWcoJ3dyaXRpbmcgY2xvc2UgcGFja2V0Jyk7XG4gICAgc2VsZi53cml0ZShbeyB0eXBlOiAnY2xvc2UnIH1dKTtcbiAgfVxuXG4gIGlmICgnb3BlbicgPT0gdGhpcy5yZWFkeVN0YXRlKSB7XG4gICAgZGVidWcoJ3RyYW5zcG9ydCBvcGVuIC0gY2xvc2luZycpO1xuICAgIGNsb3NlKCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gaW4gY2FzZSB3ZSdyZSB0cnlpbmcgdG8gY2xvc2Ugd2hpbGVcbiAgICAvLyBoYW5kc2hha2luZyBpcyBpbiBwcm9ncmVzcyAoR0gtMTY0KVxuICAgIGRlYnVnKCd0cmFuc3BvcnQgbm90IG9wZW4gLSBkZWZlcnJpbmcgY2xvc2UnKTtcbiAgICB0aGlzLm9uY2UoJ29wZW4nLCBjbG9zZSk7XG4gIH1cbn07XG5cbi8qKlxuICogV3JpdGVzIGEgcGFja2V0cyBwYXlsb2FkLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgcGFja2V0c1xuICogQHBhcmFtIHtGdW5jdGlvbn0gZHJhaW4gY2FsbGJhY2tcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblBvbGxpbmcucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24ocGFja2V0cyl7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy53cml0YWJsZSA9IGZhbHNlO1xuICB2YXIgY2FsbGJhY2tmbiA9IGZ1bmN0aW9uKCkge1xuICAgIHNlbGYud3JpdGFibGUgPSB0cnVlO1xuICAgIHNlbGYuZW1pdCgnZHJhaW4nKTtcbiAgfTtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHBhcnNlci5lbmNvZGVQYXlsb2FkKHBhY2tldHMsIHRoaXMuc3VwcG9ydHNCaW5hcnksIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBzZWxmLmRvV3JpdGUoZGF0YSwgY2FsbGJhY2tmbik7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZXMgdXJpIGZvciBjb25uZWN0aW9uLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblBvbGxpbmcucHJvdG90eXBlLnVyaSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBxdWVyeSA9IHRoaXMucXVlcnkgfHwge307XG4gIHZhciBzY2hlbWEgPSB0aGlzLnNlY3VyZSA/ICdodHRwcycgOiAnaHR0cCc7XG4gIHZhciBwb3J0ID0gJyc7XG5cbiAgLy8gY2FjaGUgYnVzdGluZyBpcyBmb3JjZWRcbiAgaWYgKGZhbHNlICE9PSB0aGlzLnRpbWVzdGFtcFJlcXVlc3RzKSB7XG4gICAgcXVlcnlbdGhpcy50aW1lc3RhbXBQYXJhbV0gPSArbmV3IERhdGUgKyAnLScgKyBUcmFuc3BvcnQudGltZXN0YW1wcysrO1xuICB9XG5cbiAgaWYgKCF0aGlzLnN1cHBvcnRzQmluYXJ5ICYmICFxdWVyeS5zaWQpIHtcbiAgICBxdWVyeS5iNjQgPSAxO1xuICB9XG5cbiAgcXVlcnkgPSBwYXJzZXFzLmVuY29kZShxdWVyeSk7XG5cbiAgLy8gYXZvaWQgcG9ydCBpZiBkZWZhdWx0IGZvciBzY2hlbWFcbiAgaWYgKHRoaXMucG9ydCAmJiAoKCdodHRwcycgPT0gc2NoZW1hICYmIHRoaXMucG9ydCAhPSA0NDMpIHx8XG4gICAgICgnaHR0cCcgPT0gc2NoZW1hICYmIHRoaXMucG9ydCAhPSA4MCkpKSB7XG4gICAgcG9ydCA9ICc6JyArIHRoaXMucG9ydDtcbiAgfVxuXG4gIC8vIHByZXBlbmQgPyB0byBxdWVyeVxuICBpZiAocXVlcnkubGVuZ3RoKSB7XG4gICAgcXVlcnkgPSAnPycgKyBxdWVyeTtcbiAgfVxuXG4gIHJldHVybiBzY2hlbWEgKyAnOi8vJyArIHRoaXMuaG9zdG5hbWUgKyBwb3J0ICsgdGhpcy5wYXRoICsgcXVlcnk7XG59O1xuIiwiLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBUcmFuc3BvcnQgPSByZXF1aXJlKCcuLi90cmFuc3BvcnQnKTtcbnZhciBwYXJzZXIgPSByZXF1aXJlKCdlbmdpbmUuaW8tcGFyc2VyJyk7XG52YXIgcGFyc2VxcyA9IHJlcXVpcmUoJ3BhcnNlcXMnKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2VuZ2luZS5pby1jbGllbnQ6d2Vic29ja2V0Jyk7XG52YXIgaW5oZXJpdCA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbi8qKlxuICogYHdzYCBleHBvc2VzIGEgV2ViU29ja2V0LWNvbXBhdGlibGUgaW50ZXJmYWNlIGluXG4gKiBOb2RlLCBvciB0aGUgYFdlYlNvY2tldGAgb3IgYE1veldlYlNvY2tldGAgZ2xvYmFsc1xuICogaW4gdGhlIGJyb3dzZXIuXG4gKi9cblxudmFyIFdlYlNvY2tldCA9IHJlcXVpcmUoJ3dzJyk7XG5cbi8qKlxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBXUztcblxuLyoqXG4gKiBXZWJTb2NrZXQgdHJhbnNwb3J0IGNvbnN0cnVjdG9yLlxuICpcbiAqIEBhcGkge09iamVjdH0gY29ubmVjdGlvbiBvcHRpb25zXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFdTKG9wdHMpe1xuICB2YXIgZm9yY2VCYXNlNjQgPSAob3B0cyAmJiBvcHRzLmZvcmNlQmFzZTY0KTtcbiAgaWYgKGZvcmNlQmFzZTY0KSB7XG4gICAgdGhpcy5zdXBwb3J0c0JpbmFyeSA9IGZhbHNlO1xuICB9XG4gIFRyYW5zcG9ydC5jYWxsKHRoaXMsIG9wdHMpO1xufVxuXG4vKipcbiAqIEluaGVyaXRzIGZyb20gVHJhbnNwb3J0LlxuICovXG5cbmluaGVyaXQoV1MsIFRyYW5zcG9ydCk7XG5cbi8qKlxuICogVHJhbnNwb3J0IG5hbWUuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5XUy5wcm90b3R5cGUubmFtZSA9ICd3ZWJzb2NrZXQnO1xuXG4vKlxuICogV2ViU29ja2V0cyBzdXBwb3J0IGJpbmFyeVxuICovXG5cbldTLnByb3RvdHlwZS5zdXBwb3J0c0JpbmFyeSA9IHRydWU7XG5cbi8qKlxuICogT3BlbnMgc29ja2V0LlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbldTLnByb3RvdHlwZS5kb09wZW4gPSBmdW5jdGlvbigpe1xuICBpZiAoIXRoaXMuY2hlY2soKSkge1xuICAgIC8vIGxldCBwcm9iZSB0aW1lb3V0XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgdXJpID0gdGhpcy51cmkoKTtcbiAgdmFyIHByb3RvY29scyA9IHZvaWQoMCk7XG4gIHZhciBvcHRzID0geyBhZ2VudDogdGhpcy5hZ2VudCB9O1xuXG4gIHRoaXMud3MgPSBuZXcgV2ViU29ja2V0KHVyaSwgcHJvdG9jb2xzLCBvcHRzKTtcblxuICBpZiAodGhpcy53cy5iaW5hcnlUeXBlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLnN1cHBvcnRzQmluYXJ5ID0gZmFsc2U7XG4gIH1cblxuICB0aGlzLndzLmJpbmFyeVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICB0aGlzLmFkZEV2ZW50TGlzdGVuZXJzKCk7XG59O1xuXG4vKipcbiAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIHRvIHRoZSBzb2NrZXRcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5XUy5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lcnMgPSBmdW5jdGlvbigpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdGhpcy53cy5vbm9wZW4gPSBmdW5jdGlvbigpe1xuICAgIHNlbGYub25PcGVuKCk7XG4gIH07XG4gIHRoaXMud3Mub25jbG9zZSA9IGZ1bmN0aW9uKCl7XG4gICAgc2VsZi5vbkNsb3NlKCk7XG4gIH07XG4gIHRoaXMud3Mub25tZXNzYWdlID0gZnVuY3Rpb24oZXYpe1xuICAgIHNlbGYub25EYXRhKGV2LmRhdGEpO1xuICB9O1xuICB0aGlzLndzLm9uZXJyb3IgPSBmdW5jdGlvbihlKXtcbiAgICBzZWxmLm9uRXJyb3IoJ3dlYnNvY2tldCBlcnJvcicsIGUpO1xuICB9O1xufTtcblxuLyoqXG4gKiBPdmVycmlkZSBgb25EYXRhYCB0byB1c2UgYSB0aW1lciBvbiBpT1MuXG4gKiBTZWU6IGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL21sb3VnaHJhbi8yMDUyMDA2XG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuaWYgKCd1bmRlZmluZWQnICE9IHR5cGVvZiBuYXZpZ2F0b3JcbiAgJiYgL2lQYWR8aVBob25lfGlQb2QvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7XG4gIFdTLnByb3RvdHlwZS5vbkRhdGEgPSBmdW5jdGlvbihkYXRhKXtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgVHJhbnNwb3J0LnByb3RvdHlwZS5vbkRhdGEuY2FsbChzZWxmLCBkYXRhKTtcbiAgICB9LCAwKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBXcml0ZXMgZGF0YSB0byBzb2NrZXQuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gYXJyYXkgb2YgcGFja2V0cy5cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbldTLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKHBhY2tldHMpe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMud3JpdGFibGUgPSBmYWxzZTtcbiAgLy8gZW5jb2RlUGFja2V0IGVmZmljaWVudCBhcyBpdCB1c2VzIFdTIGZyYW1pbmdcbiAgLy8gbm8gbmVlZCBmb3IgZW5jb2RlUGF5bG9hZFxuICBmb3IgKHZhciBpID0gMCwgbCA9IHBhY2tldHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgcGFyc2VyLmVuY29kZVBhY2tldChwYWNrZXRzW2ldLCB0aGlzLnN1cHBvcnRzQmluYXJ5LCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAvL1NvbWV0aW1lcyB0aGUgd2Vic29ja2V0IGhhcyBhbHJlYWR5IGJlZW4gY2xvc2VkIGJ1dCB0aGUgYnJvd3NlciBkaWRuJ3RcbiAgICAgIC8vaGF2ZSBhIGNoYW5jZSBvZiBpbmZvcm1pbmcgdXMgYWJvdXQgaXQgeWV0LCBpbiB0aGF0IGNhc2Ugc2VuZCB3aWxsXG4gICAgICAvL3Rocm93IGFuIGVycm9yXG4gICAgICB0cnkge1xuICAgICAgICBzZWxmLndzLnNlbmQoZGF0YSk7XG4gICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgZGVidWcoJ3dlYnNvY2tldCBjbG9zZWQgYmVmb3JlIG9uY2xvc2UgZXZlbnQnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uZHJhaW4oKSB7XG4gICAgc2VsZi53cml0YWJsZSA9IHRydWU7XG4gICAgc2VsZi5lbWl0KCdkcmFpbicpO1xuICB9XG4gIC8vIGZha2UgZHJhaW5cbiAgLy8gZGVmZXIgdG8gbmV4dCB0aWNrIHRvIGFsbG93IFNvY2tldCB0byBjbGVhciB3cml0ZUJ1ZmZlclxuICBzZXRUaW1lb3V0KG9uZHJhaW4sIDApO1xufTtcblxuLyoqXG4gKiBDYWxsZWQgdXBvbiBjbG9zZVxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbldTLnByb3RvdHlwZS5vbkNsb3NlID0gZnVuY3Rpb24oKXtcbiAgVHJhbnNwb3J0LnByb3RvdHlwZS5vbkNsb3NlLmNhbGwodGhpcyk7XG59O1xuXG4vKipcbiAqIENsb3NlcyBzb2NrZXQuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuV1MucHJvdG90eXBlLmRvQ2xvc2UgPSBmdW5jdGlvbigpe1xuICBpZiAodHlwZW9mIHRoaXMud3MgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgdGhpcy53cy5jbG9zZSgpO1xuICB9XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlcyB1cmkgZm9yIGNvbm5lY3Rpb24uXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuV1MucHJvdG90eXBlLnVyaSA9IGZ1bmN0aW9uKCl7XG4gIHZhciBxdWVyeSA9IHRoaXMucXVlcnkgfHwge307XG4gIHZhciBzY2hlbWEgPSB0aGlzLnNlY3VyZSA/ICd3c3MnIDogJ3dzJztcbiAgdmFyIHBvcnQgPSAnJztcblxuICAvLyBhdm9pZCBwb3J0IGlmIGRlZmF1bHQgZm9yIHNjaGVtYVxuICBpZiAodGhpcy5wb3J0ICYmICgoJ3dzcycgPT0gc2NoZW1hICYmIHRoaXMucG9ydCAhPSA0NDMpXG4gICAgfHwgKCd3cycgPT0gc2NoZW1hICYmIHRoaXMucG9ydCAhPSA4MCkpKSB7XG4gICAgcG9ydCA9ICc6JyArIHRoaXMucG9ydDtcbiAgfVxuXG4gIC8vIGFwcGVuZCB0aW1lc3RhbXAgdG8gVVJJXG4gIGlmICh0aGlzLnRpbWVzdGFtcFJlcXVlc3RzKSB7XG4gICAgcXVlcnlbdGhpcy50aW1lc3RhbXBQYXJhbV0gPSArbmV3IERhdGU7XG4gIH1cblxuICAvLyBjb21tdW5pY2F0ZSBiaW5hcnkgc3VwcG9ydCBjYXBhYmlsaXRpZXNcbiAgaWYgKCF0aGlzLnN1cHBvcnRzQmluYXJ5KSB7XG4gICAgcXVlcnkuYjY0ID0gMTtcbiAgfVxuXG4gIHF1ZXJ5ID0gcGFyc2Vxcy5lbmNvZGUocXVlcnkpO1xuXG4gIC8vIHByZXBlbmQgPyB0byBxdWVyeVxuICBpZiAocXVlcnkubGVuZ3RoKSB7XG4gICAgcXVlcnkgPSAnPycgKyBxdWVyeTtcbiAgfVxuXG4gIHJldHVybiBzY2hlbWEgKyAnOi8vJyArIHRoaXMuaG9zdG5hbWUgKyBwb3J0ICsgdGhpcy5wYXRoICsgcXVlcnk7XG59O1xuXG4vKipcbiAqIEZlYXR1cmUgZGV0ZWN0aW9uIGZvciBXZWJTb2NrZXQuXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn0gd2hldGhlciB0aGlzIHRyYW5zcG9ydCBpcyBhdmFpbGFibGUuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbldTLnByb3RvdHlwZS5jaGVjayA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiAhIVdlYlNvY2tldCAmJiAhKCdfX2luaXRpYWxpemUnIGluIFdlYlNvY2tldCAmJiB0aGlzLm5hbWUgPT09IFdTLnByb3RvdHlwZS5uYW1lKTtcbn07XG4iLCIvLyBicm93c2VyIHNoaW0gZm9yIHhtbGh0dHByZXF1ZXN0IG1vZHVsZVxudmFyIGhhc0NPUlMgPSByZXF1aXJlKCdoYXMtY29ycycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgdmFyIHhkb21haW4gPSBvcHRzLnhkb21haW47XG5cbiAgLy8gWE1MSHR0cFJlcXVlc3QgY2FuIGJlIGRpc2FibGVkIG9uIElFXG4gIHRyeSB7XG4gICAgaWYgKCd1bmRlZmluZWQnICE9IHR5cGVvZiBYTUxIdHRwUmVxdWVzdCAmJiAoIXhkb21haW4gfHwgaGFzQ09SUykpIHtcbiAgICAgIHJldHVybiBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHsgfVxuXG4gIGlmICgheGRvbWFpbikge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gbmV3IEFjdGl2ZVhPYmplY3QoJ01pY3Jvc29mdC5YTUxIVFRQJyk7XG4gICAgfSBjYXRjaChlKSB7IH1cbiAgfVxufVxuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBrZXlzID0gcmVxdWlyZSgnLi9rZXlzJyk7XG52YXIgc2xpY2VCdWZmZXIgPSByZXF1aXJlKCdhcnJheWJ1ZmZlci5zbGljZScpO1xudmFyIGJhc2U2NGVuY29kZXIgPSByZXF1aXJlKCdiYXNlNjQtYXJyYXlidWZmZXInKTtcbnZhciBhZnRlciA9IHJlcXVpcmUoJ2FmdGVyJyk7XG52YXIgdXRmOCA9IHJlcXVpcmUoJ3V0ZjgnKTtcblxuLyoqXG4gKiBDaGVjayBpZiB3ZSBhcmUgcnVubmluZyBhbiBhbmRyb2lkIGJyb3dzZXIuIFRoYXQgcmVxdWlyZXMgdXMgdG8gdXNlXG4gKiBBcnJheUJ1ZmZlciB3aXRoIHBvbGxpbmcgdHJhbnNwb3J0cy4uLlxuICpcbiAqIGh0dHA6Ly9naGluZGEubmV0L2pwZWctYmxvYi1hamF4LWFuZHJvaWQvXG4gKi9cblxudmFyIGlzQW5kcm9pZCA9IG5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goL0FuZHJvaWQvaSk7XG5cbi8qKlxuICogQ3VycmVudCBwcm90b2NvbCB2ZXJzaW9uLlxuICovXG5cbmV4cG9ydHMucHJvdG9jb2wgPSAyO1xuXG4vKipcbiAqIFBhY2tldCB0eXBlcy5cbiAqL1xuXG52YXIgcGFja2V0cyA9IGV4cG9ydHMucGFja2V0cyA9IHtcbiAgICBvcGVuOiAgICAgMCAgICAvLyBub24td3NcbiAgLCBjbG9zZTogICAgMSAgICAvLyBub24td3NcbiAgLCBwaW5nOiAgICAgMlxuICAsIHBvbmc6ICAgICAzXG4gICwgbWVzc2FnZTogIDRcbiAgLCB1cGdyYWRlOiAgNVxuICAsIG5vb3A6ICAgICA2XG59O1xuXG52YXIgcGFja2V0c2xpc3QgPSBrZXlzKHBhY2tldHMpO1xuXG4vKipcbiAqIFByZW1hZGUgZXJyb3IgcGFja2V0LlxuICovXG5cbnZhciBlcnIgPSB7IHR5cGU6ICdlcnJvcicsIGRhdGE6ICdwYXJzZXIgZXJyb3InIH07XG5cbi8qKlxuICogQ3JlYXRlIGEgYmxvYiBhcGkgZXZlbiBmb3IgYmxvYiBidWlsZGVyIHdoZW4gdmVuZG9yIHByZWZpeGVzIGV4aXN0XG4gKi9cblxudmFyIEJsb2IgPSByZXF1aXJlKCdibG9iJyk7XG5cbi8qKlxuICogRW5jb2RlcyBhIHBhY2tldC5cbiAqXG4gKiAgICAgPHBhY2tldCB0eXBlIGlkPiBbIDxkYXRhPiBdXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiAgICAgNWhlbGxvIHdvcmxkXG4gKiAgICAgM1xuICogICAgIDRcbiAqXG4gKiBCaW5hcnkgaXMgZW5jb2RlZCBpbiBhbiBpZGVudGljYWwgcHJpbmNpcGxlXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5lbmNvZGVQYWNrZXQgPSBmdW5jdGlvbiAocGFja2V0LCBzdXBwb3J0c0JpbmFyeSwgY2FsbGJhY2spIHtcbiAgaWYgKHR5cGVvZiBzdXBwb3J0c0JpbmFyeSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBzdXBwb3J0c0JpbmFyeTtcbiAgICBzdXBwb3J0c0JpbmFyeSA9IGZhbHNlO1xuICB9XG5cbiAgdmFyIGRhdGEgPSAocGFja2V0LmRhdGEgPT09IHVuZGVmaW5lZClcbiAgICA/IHVuZGVmaW5lZFxuICAgIDogcGFja2V0LmRhdGEuYnVmZmVyIHx8IHBhY2tldC5kYXRhO1xuXG4gIGlmIChnbG9iYWwuQXJyYXlCdWZmZXIgJiYgZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgcmV0dXJuIGVuY29kZUFycmF5QnVmZmVyKHBhY2tldCwgc3VwcG9ydHNCaW5hcnksIGNhbGxiYWNrKTtcbiAgfSBlbHNlIGlmIChCbG9iICYmIGRhdGEgaW5zdGFuY2VvZiBnbG9iYWwuQmxvYikge1xuICAgIHJldHVybiBlbmNvZGVCbG9iKHBhY2tldCwgc3VwcG9ydHNCaW5hcnksIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8vIFNlbmRpbmcgZGF0YSBhcyBhIHV0Zi04IHN0cmluZ1xuICB2YXIgZW5jb2RlZCA9IHBhY2tldHNbcGFja2V0LnR5cGVdO1xuXG4gIC8vIGRhdGEgZnJhZ21lbnQgaXMgb3B0aW9uYWxcbiAgaWYgKHVuZGVmaW5lZCAhPT0gcGFja2V0LmRhdGEpIHtcbiAgICBlbmNvZGVkICs9IHV0ZjguZW5jb2RlKFN0cmluZyhwYWNrZXQuZGF0YSkpO1xuICB9XG5cbiAgcmV0dXJuIGNhbGxiYWNrKCcnICsgZW5jb2RlZCk7XG5cbn07XG5cbi8qKlxuICogRW5jb2RlIHBhY2tldCBoZWxwZXJzIGZvciBiaW5hcnkgdHlwZXNcbiAqL1xuXG5mdW5jdGlvbiBlbmNvZGVBcnJheUJ1ZmZlcihwYWNrZXQsIHN1cHBvcnRzQmluYXJ5LCBjYWxsYmFjaykge1xuICBpZiAoIXN1cHBvcnRzQmluYXJ5KSB7XG4gICAgcmV0dXJuIGV4cG9ydHMuZW5jb2RlQmFzZTY0UGFja2V0KHBhY2tldCwgY2FsbGJhY2spO1xuICB9XG5cbiAgdmFyIGRhdGEgPSBwYWNrZXQuZGF0YTtcbiAgdmFyIGNvbnRlbnRBcnJheSA9IG5ldyBVaW50OEFycmF5KGRhdGEpO1xuICB2YXIgcmVzdWx0QnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoMSArIGRhdGEuYnl0ZUxlbmd0aCk7XG5cbiAgcmVzdWx0QnVmZmVyWzBdID0gcGFja2V0c1twYWNrZXQudHlwZV07XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY29udGVudEFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgcmVzdWx0QnVmZmVyW2krMV0gPSBjb250ZW50QXJyYXlbaV07XG4gIH1cblxuICByZXR1cm4gY2FsbGJhY2socmVzdWx0QnVmZmVyLmJ1ZmZlcik7XG59XG5cbmZ1bmN0aW9uIGVuY29kZUJsb2JBc0FycmF5QnVmZmVyKHBhY2tldCwgc3VwcG9ydHNCaW5hcnksIGNhbGxiYWNrKSB7XG4gIGlmICghc3VwcG9ydHNCaW5hcnkpIHtcbiAgICByZXR1cm4gZXhwb3J0cy5lbmNvZGVCYXNlNjRQYWNrZXQocGFja2V0LCBjYWxsYmFjayk7XG4gIH1cblxuICB2YXIgZnIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICBmci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICBwYWNrZXQuZGF0YSA9IGZyLnJlc3VsdDtcbiAgICBleHBvcnRzLmVuY29kZVBhY2tldChwYWNrZXQsIHN1cHBvcnRzQmluYXJ5LCBjYWxsYmFjayk7XG4gIH07XG4gIHJldHVybiBmci5yZWFkQXNBcnJheUJ1ZmZlcihwYWNrZXQuZGF0YSk7XG59XG5cbmZ1bmN0aW9uIGVuY29kZUJsb2IocGFja2V0LCBzdXBwb3J0c0JpbmFyeSwgY2FsbGJhY2spIHtcbiAgaWYgKCFzdXBwb3J0c0JpbmFyeSkge1xuICAgIHJldHVybiBleHBvcnRzLmVuY29kZUJhc2U2NFBhY2tldChwYWNrZXQsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIGlmIChpc0FuZHJvaWQpIHtcbiAgICByZXR1cm4gZW5jb2RlQmxvYkFzQXJyYXlCdWZmZXIocGFja2V0LCBzdXBwb3J0c0JpbmFyeSwgY2FsbGJhY2spO1xuICB9XG5cbiAgdmFyIGxlbmd0aCA9IG5ldyBVaW50OEFycmF5KDEpO1xuICBsZW5ndGhbMF0gPSBwYWNrZXRzW3BhY2tldC50eXBlXTtcbiAgdmFyIGJsb2IgPSBuZXcgQmxvYihbbGVuZ3RoLmJ1ZmZlciwgcGFja2V0LmRhdGFdKTtcblxuICByZXR1cm4gY2FsbGJhY2soYmxvYik7XG59XG5cbi8qKlxuICogRW5jb2RlcyBhIHBhY2tldCB3aXRoIGJpbmFyeSBkYXRhIGluIGEgYmFzZTY0IHN0cmluZ1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBwYWNrZXQsIGhhcyBgdHlwZWAgYW5kIGBkYXRhYFxuICogQHJldHVybiB7U3RyaW5nfSBiYXNlNjQgZW5jb2RlZCBtZXNzYWdlXG4gKi9cblxuZXhwb3J0cy5lbmNvZGVCYXNlNjRQYWNrZXQgPSBmdW5jdGlvbihwYWNrZXQsIGNhbGxiYWNrKSB7XG4gIHZhciBtZXNzYWdlID0gJ2InICsgZXhwb3J0cy5wYWNrZXRzW3BhY2tldC50eXBlXTtcbiAgaWYgKEJsb2IgJiYgcGFja2V0LmRhdGEgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgdmFyIGZyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICBmci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBiNjQgPSBmci5yZXN1bHQuc3BsaXQoJywnKVsxXTtcbiAgICAgIGNhbGxiYWNrKG1lc3NhZ2UgKyBiNjQpO1xuICAgIH07XG4gICAgcmV0dXJuIGZyLnJlYWRBc0RhdGFVUkwocGFja2V0LmRhdGEpO1xuICB9XG5cbiAgdmFyIGI2NGRhdGE7XG4gIHRyeSB7XG4gICAgYjY0ZGF0YSA9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgbmV3IFVpbnQ4QXJyYXkocGFja2V0LmRhdGEpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIGlQaG9uZSBTYWZhcmkgZG9lc24ndCBsZXQgeW91IGFwcGx5IHdpdGggdHlwZWQgYXJyYXlzXG4gICAgdmFyIHR5cGVkID0gbmV3IFVpbnQ4QXJyYXkocGFja2V0LmRhdGEpO1xuICAgIHZhciBiYXNpYyA9IG5ldyBBcnJheSh0eXBlZC5sZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdHlwZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgIGJhc2ljW2ldID0gdHlwZWRbaV07XG4gICAgfVxuICAgIGI2NGRhdGEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIGJhc2ljKTtcbiAgfVxuICBtZXNzYWdlICs9IGdsb2JhbC5idG9hKGI2NGRhdGEpO1xuICByZXR1cm4gY2FsbGJhY2sobWVzc2FnZSk7XG59O1xuXG4vKipcbiAqIERlY29kZXMgYSBwYWNrZXQuIENoYW5nZXMgZm9ybWF0IHRvIEJsb2IgaWYgcmVxdWVzdGVkLlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gd2l0aCBgdHlwZWAgYW5kIGBkYXRhYCAoaWYgYW55KVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5kZWNvZGVQYWNrZXQgPSBmdW5jdGlvbiAoZGF0YSwgYmluYXJ5VHlwZSkge1xuICAvLyBTdHJpbmcgZGF0YVxuICBpZiAodHlwZW9mIGRhdGEgPT0gJ3N0cmluZycgfHwgZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGRhdGEuY2hhckF0KDApID09ICdiJykge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVjb2RlQmFzZTY0UGFja2V0KGRhdGEuc3Vic3RyKDEpLCBiaW5hcnlUeXBlKTtcbiAgICB9XG5cbiAgICBkYXRhID0gdXRmOC5kZWNvZGUoZGF0YSk7XG4gICAgdmFyIHR5cGUgPSBkYXRhLmNoYXJBdCgwKTtcblxuICAgIGlmIChOdW1iZXIodHlwZSkgIT0gdHlwZSB8fCAhcGFja2V0c2xpc3RbdHlwZV0pIHtcbiAgICAgIHJldHVybiBlcnI7XG4gICAgfVxuXG4gICAgaWYgKGRhdGEubGVuZ3RoID4gMSkge1xuICAgICAgcmV0dXJuIHsgdHlwZTogcGFja2V0c2xpc3RbdHlwZV0sIGRhdGE6IGRhdGEuc3Vic3RyaW5nKDEpIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7IHR5cGU6IHBhY2tldHNsaXN0W3R5cGVdIH07XG4gICAgfVxuICB9XG5cbiAgdmFyIGFzQXJyYXkgPSBuZXcgVWludDhBcnJheShkYXRhKTtcbiAgdmFyIHR5cGUgPSBhc0FycmF5WzBdO1xuICB2YXIgcmVzdCA9IHNsaWNlQnVmZmVyKGRhdGEsIDEpO1xuICBpZiAoQmxvYiAmJiBiaW5hcnlUeXBlID09PSAnYmxvYicpIHtcbiAgICByZXN0ID0gbmV3IEJsb2IoW3Jlc3RdKTtcbiAgfVxuICByZXR1cm4geyB0eXBlOiBwYWNrZXRzbGlzdFt0eXBlXSwgZGF0YTogcmVzdCB9O1xufTtcblxuLyoqXG4gKiBEZWNvZGVzIGEgcGFja2V0IGVuY29kZWQgaW4gYSBiYXNlNjQgc3RyaW5nXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGJhc2U2NCBlbmNvZGVkIG1lc3NhZ2VcbiAqIEByZXR1cm4ge09iamVjdH0gd2l0aCBgdHlwZWAgYW5kIGBkYXRhYCAoaWYgYW55KVxuICovXG5cbmV4cG9ydHMuZGVjb2RlQmFzZTY0UGFja2V0ID0gZnVuY3Rpb24obXNnLCBiaW5hcnlUeXBlKSB7XG4gIHZhciB0eXBlID0gcGFja2V0c2xpc3RbbXNnLmNoYXJBdCgwKV07XG4gIGlmICghZ2xvYmFsLkFycmF5QnVmZmVyKSB7XG4gICAgcmV0dXJuIHsgdHlwZTogdHlwZSwgZGF0YTogeyBiYXNlNjQ6IHRydWUsIGRhdGE6IG1zZy5zdWJzdHIoMSkgfSB9O1xuICB9XG5cbiAgdmFyIGRhdGEgPSBiYXNlNjRlbmNvZGVyLmRlY29kZShtc2cuc3Vic3RyKDEpKTtcblxuICBpZiAoYmluYXJ5VHlwZSA9PT0gJ2Jsb2InICYmIEJsb2IpIHtcbiAgICBkYXRhID0gbmV3IEJsb2IoW2RhdGFdKTtcbiAgfVxuXG4gIHJldHVybiB7IHR5cGU6IHR5cGUsIGRhdGE6IGRhdGEgfTtcbn07XG5cbi8qKlxuICogRW5jb2RlcyBtdWx0aXBsZSBtZXNzYWdlcyAocGF5bG9hZCkuXG4gKlxuICogICAgIDxsZW5ndGg+OmRhdGFcbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqICAgICAxMTpoZWxsbyB3b3JsZDI6aGlcbiAqXG4gKiBJZiBhbnkgY29udGVudHMgYXJlIGJpbmFyeSwgdGhleSB3aWxsIGJlIGVuY29kZWQgYXMgYmFzZTY0IHN0cmluZ3MuIEJhc2U2NFxuICogZW5jb2RlZCBzdHJpbmdzIGFyZSBtYXJrZWQgd2l0aCBhIGIgYmVmb3JlIHRoZSBsZW5ndGggc3BlY2lmaWVyXG4gKlxuICogQHBhcmFtIHtBcnJheX0gcGFja2V0c1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5lbmNvZGVQYXlsb2FkID0gZnVuY3Rpb24gKHBhY2tldHMsIHN1cHBvcnRzQmluYXJ5LCBjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIHN1cHBvcnRzQmluYXJ5ID09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IHN1cHBvcnRzQmluYXJ5O1xuICAgIHN1cHBvcnRzQmluYXJ5ID0gbnVsbDtcbiAgfVxuXG4gIGlmIChzdXBwb3J0c0JpbmFyeSkge1xuICAgIGlmIChCbG9iICYmICFpc0FuZHJvaWQpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmVuY29kZVBheWxvYWRBc0Jsb2IocGFja2V0cywgY2FsbGJhY2spO1xuICAgIH1cblxuICAgIHJldHVybiBleHBvcnRzLmVuY29kZVBheWxvYWRBc0FycmF5QnVmZmVyKHBhY2tldHMsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIGlmICghcGFja2V0cy5sZW5ndGgpIHtcbiAgICByZXR1cm4gY2FsbGJhY2soJzA6Jyk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRMZW5ndGhIZWFkZXIobWVzc2FnZSkge1xuICAgIHJldHVybiBtZXNzYWdlLmxlbmd0aCArICc6JyArIG1lc3NhZ2U7XG4gIH1cblxuICBmdW5jdGlvbiBlbmNvZGVPbmUocGFja2V0LCBkb25lQ2FsbGJhY2spIHtcbiAgICBleHBvcnRzLmVuY29kZVBhY2tldChwYWNrZXQsIHN1cHBvcnRzQmluYXJ5LCBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICBkb25lQ2FsbGJhY2sobnVsbCwgc2V0TGVuZ3RoSGVhZGVyKG1lc3NhZ2UpKTtcbiAgICB9KTtcbiAgfVxuXG4gIG1hcChwYWNrZXRzLCBlbmNvZGVPbmUsIGZ1bmN0aW9uKGVyciwgcmVzdWx0cykge1xuICAgIHJldHVybiBjYWxsYmFjayhyZXN1bHRzLmpvaW4oJycpKTtcbiAgfSk7XG59O1xuXG4vKipcbiAqIEFzeW5jIGFycmF5IG1hcCB1c2luZyBhZnRlclxuICovXG5cbmZ1bmN0aW9uIG1hcChhcnksIGVhY2gsIGRvbmUpIHtcbiAgdmFyIHJlc3VsdCA9IG5ldyBBcnJheShhcnkubGVuZ3RoKTtcbiAgdmFyIG5leHQgPSBhZnRlcihhcnkubGVuZ3RoLCBkb25lKTtcblxuICB2YXIgZWFjaFdpdGhJbmRleCA9IGZ1bmN0aW9uKGksIGVsLCBjYikge1xuICAgIGVhY2goZWwsIGZ1bmN0aW9uKGVycm9yLCBtc2cpIHtcbiAgICAgIHJlc3VsdFtpXSA9IG1zZztcbiAgICAgIGNiKGVycm9yLCByZXN1bHQpO1xuICAgIH0pO1xuICB9O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJ5Lmxlbmd0aDsgaSsrKSB7XG4gICAgZWFjaFdpdGhJbmRleChpLCBhcnlbaV0sIG5leHQpO1xuICB9XG59XG5cbi8qXG4gKiBEZWNvZGVzIGRhdGEgd2hlbiBhIHBheWxvYWQgaXMgbWF5YmUgZXhwZWN0ZWQuIFBvc3NpYmxlIGJpbmFyeSBjb250ZW50cyBhcmVcbiAqIGRlY29kZWQgZnJvbSB0aGVpciBiYXNlNjQgcmVwcmVzZW50YXRpb25cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZGF0YSwgY2FsbGJhY2sgbWV0aG9kXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmV4cG9ydHMuZGVjb2RlUGF5bG9hZCA9IGZ1bmN0aW9uIChkYXRhLCBiaW5hcnlUeXBlLCBjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIGRhdGEgIT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZXhwb3J0cy5kZWNvZGVQYXlsb2FkQXNCaW5hcnkoZGF0YSwgYmluYXJ5VHlwZSwgY2FsbGJhY2spO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBiaW5hcnlUeXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBiaW5hcnlUeXBlO1xuICAgIGJpbmFyeVR5cGUgPSBudWxsO1xuICB9XG5cbiAgdmFyIHBhY2tldDtcbiAgaWYgKGRhdGEgPT0gJycpIHtcbiAgICAvLyBwYXJzZXIgZXJyb3IgLSBpZ25vcmluZyBwYXlsb2FkXG4gICAgcmV0dXJuIGNhbGxiYWNrKGVyciwgMCwgMSk7XG4gIH1cblxuICB2YXIgbGVuZ3RoID0gJydcbiAgICAsIG4sIG1zZztcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGRhdGEubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdmFyIGNociA9IGRhdGEuY2hhckF0KGkpO1xuXG4gICAgaWYgKCc6JyAhPSBjaHIpIHtcbiAgICAgIGxlbmd0aCArPSBjaHI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICgnJyA9PSBsZW5ndGggfHwgKGxlbmd0aCAhPSAobiA9IE51bWJlcihsZW5ndGgpKSkpIHtcbiAgICAgICAgLy8gcGFyc2VyIGVycm9yIC0gaWdub3JpbmcgcGF5bG9hZFxuICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyLCAwLCAxKTtcbiAgICAgIH1cblxuICAgICAgbXNnID0gZGF0YS5zdWJzdHIoaSArIDEsIG4pO1xuXG4gICAgICBpZiAobGVuZ3RoICE9IG1zZy5sZW5ndGgpIHtcbiAgICAgICAgLy8gcGFyc2VyIGVycm9yIC0gaWdub3JpbmcgcGF5bG9hZFxuICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyLCAwLCAxKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG1zZy5sZW5ndGgpIHtcbiAgICAgICAgcGFja2V0ID0gZXhwb3J0cy5kZWNvZGVQYWNrZXQobXNnLCBiaW5hcnlUeXBlKTtcblxuICAgICAgICBpZiAoZXJyLnR5cGUgPT0gcGFja2V0LnR5cGUgJiYgZXJyLmRhdGEgPT0gcGFja2V0LmRhdGEpIHtcbiAgICAgICAgICAvLyBwYXJzZXIgZXJyb3IgaW4gaW5kaXZpZHVhbCBwYWNrZXQgLSBpZ25vcmluZyBwYXlsb2FkXG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVyciwgMCwgMSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmV0ID0gY2FsbGJhY2socGFja2V0LCBpICsgbiwgbCk7XG4gICAgICAgIGlmIChmYWxzZSA9PT0gcmV0KSByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGFkdmFuY2UgY3Vyc29yXG4gICAgICBpICs9IG47XG4gICAgICBsZW5ndGggPSAnJztcbiAgICB9XG4gIH1cblxuICBpZiAobGVuZ3RoICE9ICcnKSB7XG4gICAgLy8gcGFyc2VyIGVycm9yIC0gaWdub3JpbmcgcGF5bG9hZFxuICAgIHJldHVybiBjYWxsYmFjayhlcnIsIDAsIDEpO1xuICB9XG5cbn07XG5cbi8qKlxuICogRW5jb2RlcyBtdWx0aXBsZSBtZXNzYWdlcyAocGF5bG9hZCkgYXMgYmluYXJ5LlxuICpcbiAqIDwxID0gYmluYXJ5LCAwID0gc3RyaW5nPjxudW1iZXIgZnJvbSAwLTk+PG51bWJlciBmcm9tIDAtOT5bLi4uXTxudW1iZXJcbiAqIDI1NT48ZGF0YT5cbiAqXG4gKiBFeGFtcGxlOlxuICogMSAzIDI1NSAxIDIgMywgaWYgdGhlIGJpbmFyeSBjb250ZW50cyBhcmUgaW50ZXJwcmV0ZWQgYXMgOCBiaXQgaW50ZWdlcnNcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBwYWNrZXRzXG4gKiBAcmV0dXJuIHtBcnJheUJ1ZmZlcn0gZW5jb2RlZCBwYXlsb2FkXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLmVuY29kZVBheWxvYWRBc0FycmF5QnVmZmVyID0gZnVuY3Rpb24ocGFja2V0cywgY2FsbGJhY2spIHtcbiAgaWYgKCFwYWNrZXRzLmxlbmd0aCkge1xuICAgIHJldHVybiBjYWxsYmFjayhuZXcgQXJyYXlCdWZmZXIoMCkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZW5jb2RlT25lKHBhY2tldCwgZG9uZUNhbGxiYWNrKSB7XG4gICAgZXhwb3J0cy5lbmNvZGVQYWNrZXQocGFja2V0LCB0cnVlLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gZG9uZUNhbGxiYWNrKG51bGwsIGRhdGEpO1xuICAgIH0pO1xuICB9XG5cbiAgbWFwKHBhY2tldHMsIGVuY29kZU9uZSwgZnVuY3Rpb24oZXJyLCBlbmNvZGVkUGFja2V0cykge1xuICAgIHZhciB0b3RhbExlbmd0aCA9IGVuY29kZWRQYWNrZXRzLnJlZHVjZShmdW5jdGlvbihhY2MsIHApIHtcbiAgICAgIHZhciBsZW47XG4gICAgICBpZiAodHlwZW9mIHAgPT09ICdzdHJpbmcnKXtcbiAgICAgICAgbGVuID0gcC5sZW5ndGg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZW4gPSBwLmJ5dGVMZW5ndGg7XG4gICAgICB9XG4gICAgICByZXR1cm4gYWNjICsgbGVuLnRvU3RyaW5nKCkubGVuZ3RoICsgbGVuICsgMjsgLy8gc3RyaW5nL2JpbmFyeSBpZGVudGlmaWVyICsgc2VwYXJhdG9yID0gMlxuICAgIH0sIDApO1xuXG4gICAgdmFyIHJlc3VsdEFycmF5ID0gbmV3IFVpbnQ4QXJyYXkodG90YWxMZW5ndGgpO1xuXG4gICAgdmFyIGJ1ZmZlckluZGV4ID0gMDtcbiAgICBlbmNvZGVkUGFja2V0cy5mb3JFYWNoKGZ1bmN0aW9uKHApIHtcbiAgICAgIHZhciBpc1N0cmluZyA9IHR5cGVvZiBwID09PSAnc3RyaW5nJztcbiAgICAgIHZhciBhYiA9IHA7XG4gICAgICBpZiAoaXNTdHJpbmcpIHtcbiAgICAgICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShwLmxlbmd0aCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHZpZXdbaV0gPSBwLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgIH1cbiAgICAgICAgYWIgPSB2aWV3LmJ1ZmZlcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzU3RyaW5nKSB7IC8vIG5vdCB0cnVlIGJpbmFyeVxuICAgICAgICByZXN1bHRBcnJheVtidWZmZXJJbmRleCsrXSA9IDA7XG4gICAgICB9IGVsc2UgeyAvLyB0cnVlIGJpbmFyeVxuICAgICAgICByZXN1bHRBcnJheVtidWZmZXJJbmRleCsrXSA9IDE7XG4gICAgICB9XG5cbiAgICAgIHZhciBsZW5TdHIgPSBhYi5ieXRlTGVuZ3RoLnRvU3RyaW5nKCk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlblN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgICByZXN1bHRBcnJheVtidWZmZXJJbmRleCsrXSA9IHBhcnNlSW50KGxlblN0cltpXSk7XG4gICAgICB9XG4gICAgICByZXN1bHRBcnJheVtidWZmZXJJbmRleCsrXSA9IDI1NTtcblxuICAgICAgdmFyIHZpZXcgPSBuZXcgVWludDhBcnJheShhYik7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZpZXcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcmVzdWx0QXJyYXlbYnVmZmVySW5kZXgrK10gPSB2aWV3W2ldO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNhbGxiYWNrKHJlc3VsdEFycmF5LmJ1ZmZlcik7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBFbmNvZGUgYXMgQmxvYlxuICovXG5cbmV4cG9ydHMuZW5jb2RlUGF5bG9hZEFzQmxvYiA9IGZ1bmN0aW9uKHBhY2tldHMsIGNhbGxiYWNrKSB7XG4gIGZ1bmN0aW9uIGVuY29kZU9uZShwYWNrZXQsIGRvbmVDYWxsYmFjaykge1xuICAgIGV4cG9ydHMuZW5jb2RlUGFja2V0KHBhY2tldCwgdHJ1ZSwgZnVuY3Rpb24oZW5jb2RlZCkge1xuICAgICAgdmFyIGJpbmFyeUlkZW50aWZpZXIgPSBuZXcgVWludDhBcnJheSgxKTtcbiAgICAgIGJpbmFyeUlkZW50aWZpZXJbMF0gPSAxO1xuICAgICAgaWYgKHR5cGVvZiBlbmNvZGVkID09PSAnc3RyaW5nJykge1xuICAgICAgICB2YXIgdmlldyA9IG5ldyBVaW50OEFycmF5KGVuY29kZWQubGVuZ3RoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbmNvZGVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmlld1tpXSA9IGVuY29kZWQuY2hhckNvZGVBdChpKTtcbiAgICAgICAgfVxuICAgICAgICBlbmNvZGVkID0gdmlldy5idWZmZXI7XG4gICAgICAgIGJpbmFyeUlkZW50aWZpZXJbMF0gPSAwO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGVuID0gKGVuY29kZWQgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcilcbiAgICAgICAgPyBlbmNvZGVkLmJ5dGVMZW5ndGhcbiAgICAgICAgOiBlbmNvZGVkLnNpemU7XG5cbiAgICAgIHZhciBsZW5TdHIgPSBsZW4udG9TdHJpbmcoKTtcbiAgICAgIHZhciBsZW5ndGhBcnkgPSBuZXcgVWludDhBcnJheShsZW5TdHIubGVuZ3RoICsgMSk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlblN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZW5ndGhBcnlbaV0gPSBwYXJzZUludChsZW5TdHJbaV0pO1xuICAgICAgfVxuICAgICAgbGVuZ3RoQXJ5W2xlblN0ci5sZW5ndGhdID0gMjU1O1xuXG4gICAgICBpZiAoQmxvYikge1xuICAgICAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFtiaW5hcnlJZGVudGlmaWVyLmJ1ZmZlciwgbGVuZ3RoQXJ5LmJ1ZmZlciwgZW5jb2RlZF0pO1xuICAgICAgICBkb25lQ2FsbGJhY2sobnVsbCwgYmxvYik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBtYXAocGFja2V0cywgZW5jb2RlT25lLCBmdW5jdGlvbihlcnIsIHJlc3VsdHMpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sobmV3IEJsb2IocmVzdWx0cykpO1xuICB9KTtcbn07XG5cbi8qXG4gKiBEZWNvZGVzIGRhdGEgd2hlbiBhIHBheWxvYWQgaXMgbWF5YmUgZXhwZWN0ZWQuIFN0cmluZ3MgYXJlIGRlY29kZWQgYnlcbiAqIGludGVycHJldGluZyBlYWNoIGJ5dGUgYXMgYSBrZXkgY29kZSBmb3IgZW50cmllcyBtYXJrZWQgdG8gc3RhcnQgd2l0aCAwLiBTZWVcbiAqIGRlc2NyaXB0aW9uIG9mIGVuY29kZVBheWxvYWRBc0JpbmFyeVxuICpcbiAqIEBwYXJhbSB7QXJyYXlCdWZmZXJ9IGRhdGEsIGNhbGxiYWNrIG1ldGhvZFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5leHBvcnRzLmRlY29kZVBheWxvYWRBc0JpbmFyeSA9IGZ1bmN0aW9uIChkYXRhLCBiaW5hcnlUeXBlLCBjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIGJpbmFyeVR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IGJpbmFyeVR5cGU7XG4gICAgYmluYXJ5VHlwZSA9IG51bGw7XG4gIH1cblxuICB2YXIgYnVmZmVyVGFpbCA9IGRhdGE7XG4gIHZhciBidWZmZXJzID0gW107XG5cbiAgd2hpbGUgKGJ1ZmZlclRhaWwuYnl0ZUxlbmd0aCA+IDApIHtcbiAgICB2YXIgdGFpbEFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyVGFpbCk7XG4gICAgdmFyIGlzU3RyaW5nID0gdGFpbEFycmF5WzBdID09PSAwO1xuICAgIHZhciBtc2dMZW5ndGggPSAnJztcbiAgICBmb3IgKHZhciBpID0gMTsgOyBpKyspIHtcbiAgICAgIGlmICh0YWlsQXJyYXlbaV0gPT0gMjU1KSBicmVhaztcbiAgICAgIG1zZ0xlbmd0aCArPSB0YWlsQXJyYXlbaV07XG4gICAgfVxuICAgIGJ1ZmZlclRhaWwgPSBzbGljZUJ1ZmZlcihidWZmZXJUYWlsLCAyICsgbXNnTGVuZ3RoLmxlbmd0aCk7XG4gICAgbXNnTGVuZ3RoID0gcGFyc2VJbnQobXNnTGVuZ3RoKTtcblxuICAgIHZhciBtc2cgPSBzbGljZUJ1ZmZlcihidWZmZXJUYWlsLCAwLCBtc2dMZW5ndGgpO1xuICAgIGlmIChpc1N0cmluZykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbXNnID0gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLCBuZXcgVWludDhBcnJheShtc2cpKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gaVBob25lIFNhZmFyaSBkb2Vzbid0IGxldCB5b3UgYXBwbHkgdG8gdHlwZWQgYXJyYXlzXG4gICAgICAgIHZhciB0eXBlZCA9IG5ldyBVaW50OEFycmF5KG1zZyk7XG4gICAgICAgIG1zZyA9ICcnO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgbXNnICs9IFN0cmluZy5mcm9tQ2hhckNvZGUodHlwZWRbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGJ1ZmZlcnMucHVzaChtc2cpO1xuICAgIGJ1ZmZlclRhaWwgPSBzbGljZUJ1ZmZlcihidWZmZXJUYWlsLCBtc2dMZW5ndGgpO1xuICB9XG5cbiAgdmFyIHRvdGFsID0gYnVmZmVycy5sZW5ndGg7XG4gIGJ1ZmZlcnMuZm9yRWFjaChmdW5jdGlvbihidWZmZXIsIGkpIHtcbiAgICBjYWxsYmFjayhleHBvcnRzLmRlY29kZVBhY2tldChidWZmZXIsIGJpbmFyeVR5cGUpLCBpLCB0b3RhbCk7XG4gIH0pO1xufTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJcbi8qKlxuICogR2V0cyB0aGUga2V5cyBmb3IgYW4gb2JqZWN0LlxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBrZXlzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIGtleXMgKG9iail7XG4gIHZhciBhcnIgPSBbXTtcbiAgdmFyIGhhcyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbiAgZm9yICh2YXIgaSBpbiBvYmopIHtcbiAgICBpZiAoaGFzLmNhbGwob2JqLCBpKSkge1xuICAgICAgYXJyLnB1c2goaSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBhcnI7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhZnRlclxuXG5mdW5jdGlvbiBhZnRlcihjb3VudCwgY2FsbGJhY2ssIGVycl9jYikge1xuICAgIHZhciBiYWlsID0gZmFsc2VcbiAgICBlcnJfY2IgPSBlcnJfY2IgfHwgbm9vcFxuICAgIHByb3h5LmNvdW50ID0gY291bnRcblxuICAgIHJldHVybiAoY291bnQgPT09IDApID8gY2FsbGJhY2soKSA6IHByb3h5XG5cbiAgICBmdW5jdGlvbiBwcm94eShlcnIsIHJlc3VsdCkge1xuICAgICAgICBpZiAocHJveHkuY291bnQgPD0gMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdhZnRlciBjYWxsZWQgdG9vIG1hbnkgdGltZXMnKVxuICAgICAgICB9XG4gICAgICAgIC0tcHJveHkuY291bnRcblxuICAgICAgICAvLyBhZnRlciBmaXJzdCBlcnJvciwgcmVzdCBhcmUgcGFzc2VkIHRvIGVycl9jYlxuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBiYWlsID0gdHJ1ZVxuICAgICAgICAgICAgY2FsbGJhY2soZXJyKVxuICAgICAgICAgICAgLy8gZnV0dXJlIGVycm9yIGNhbGxiYWNrcyB3aWxsIGdvIHRvIGVycm9yIGhhbmRsZXJcbiAgICAgICAgICAgIGNhbGxiYWNrID0gZXJyX2NiXG4gICAgICAgIH0gZWxzZSBpZiAocHJveHkuY291bnQgPT09IDAgJiYgIWJhaWwpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdClcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gbm9vcCgpIHt9XG4iLCIvKipcbiAqIEFuIGFic3RyYWN0aW9uIGZvciBzbGljaW5nIGFuIGFycmF5YnVmZmVyIGV2ZW4gd2hlblxuICogQXJyYXlCdWZmZXIucHJvdG90eXBlLnNsaWNlIGlzIG5vdCBzdXBwb3J0ZWRcbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXJyYXlidWZmZXIsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYXJyYXlidWZmZXIuYnl0ZUxlbmd0aDtcbiAgc3RhcnQgPSBzdGFydCB8fCAwO1xuICBlbmQgPSBlbmQgfHwgYnl0ZXM7XG5cbiAgaWYgKGFycmF5YnVmZmVyLnNsaWNlKSB7IHJldHVybiBhcnJheWJ1ZmZlci5zbGljZShzdGFydCwgZW5kKTsgfVxuXG4gIGlmIChzdGFydCA8IDApIHsgc3RhcnQgKz0gYnl0ZXM7IH1cbiAgaWYgKGVuZCA8IDApIHsgZW5kICs9IGJ5dGVzOyB9XG4gIGlmIChlbmQgPiBieXRlcykgeyBlbmQgPSBieXRlczsgfVxuXG4gIGlmIChzdGFydCA+PSBieXRlcyB8fCBzdGFydCA+PSBlbmQgfHwgYnl0ZXMgPT09IDApIHtcbiAgICByZXR1cm4gbmV3IEFycmF5QnVmZmVyKDApO1xuICB9XG5cbiAgdmFyIGFidiA9IG5ldyBVaW50OEFycmF5KGFycmF5YnVmZmVyKTtcbiAgdmFyIHJlc3VsdCA9IG5ldyBVaW50OEFycmF5KGVuZCAtIHN0YXJ0KTtcbiAgZm9yICh2YXIgaSA9IHN0YXJ0LCBpaSA9IDA7IGkgPCBlbmQ7IGkrKywgaWkrKykge1xuICAgIHJlc3VsdFtpaV0gPSBhYnZbaV07XG4gIH1cbiAgcmV0dXJuIHJlc3VsdC5idWZmZXI7XG59O1xuIiwiLypcbiAqIGJhc2U2NC1hcnJheWJ1ZmZlclxuICogaHR0cHM6Ly9naXRodWIuY29tL25pa2xhc3ZoL2Jhc2U2NC1hcnJheWJ1ZmZlclxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMiBOaWtsYXMgdm9uIEhlcnR6ZW5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqL1xuKGZ1bmN0aW9uKGNoYXJzKXtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgZXhwb3J0cy5lbmNvZGUgPSBmdW5jdGlvbihhcnJheWJ1ZmZlcikge1xuICAgIHZhciBieXRlcyA9IG5ldyBVaW50OEFycmF5KGFycmF5YnVmZmVyKSxcbiAgICBpLCBsZW4gPSBieXRlcy5sZW5ndGgsIGJhc2U2NCA9IFwiXCI7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKz0zKSB7XG4gICAgICBiYXNlNjQgKz0gY2hhcnNbYnl0ZXNbaV0gPj4gMl07XG4gICAgICBiYXNlNjQgKz0gY2hhcnNbKChieXRlc1tpXSAmIDMpIDw8IDQpIHwgKGJ5dGVzW2kgKyAxXSA+PiA0KV07XG4gICAgICBiYXNlNjQgKz0gY2hhcnNbKChieXRlc1tpICsgMV0gJiAxNSkgPDwgMikgfCAoYnl0ZXNbaSArIDJdID4+IDYpXTtcbiAgICAgIGJhc2U2NCArPSBjaGFyc1tieXRlc1tpICsgMl0gJiA2M107XG4gICAgfVxuXG4gICAgaWYgKChsZW4gJSAzKSA9PT0gMikge1xuICAgICAgYmFzZTY0ID0gYmFzZTY0LnN1YnN0cmluZygwLCBiYXNlNjQubGVuZ3RoIC0gMSkgKyBcIj1cIjtcbiAgICB9IGVsc2UgaWYgKGxlbiAlIDMgPT09IDEpIHtcbiAgICAgIGJhc2U2NCA9IGJhc2U2NC5zdWJzdHJpbmcoMCwgYmFzZTY0Lmxlbmd0aCAtIDIpICsgXCI9PVwiO1xuICAgIH1cblxuICAgIHJldHVybiBiYXNlNjQ7XG4gIH07XG5cbiAgZXhwb3J0cy5kZWNvZGUgPSAgZnVuY3Rpb24oYmFzZTY0KSB7XG4gICAgdmFyIGJ1ZmZlckxlbmd0aCA9IGJhc2U2NC5sZW5ndGggKiAwLjc1LFxuICAgIGxlbiA9IGJhc2U2NC5sZW5ndGgsIGksIHAgPSAwLFxuICAgIGVuY29kZWQxLCBlbmNvZGVkMiwgZW5jb2RlZDMsIGVuY29kZWQ0O1xuXG4gICAgaWYgKGJhc2U2NFtiYXNlNjQubGVuZ3RoIC0gMV0gPT09IFwiPVwiKSB7XG4gICAgICBidWZmZXJMZW5ndGgtLTtcbiAgICAgIGlmIChiYXNlNjRbYmFzZTY0Lmxlbmd0aCAtIDJdID09PSBcIj1cIikge1xuICAgICAgICBidWZmZXJMZW5ndGgtLTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgYXJyYXlidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoYnVmZmVyTGVuZ3RoKSxcbiAgICBieXRlcyA9IG5ldyBVaW50OEFycmF5KGFycmF5YnVmZmVyKTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrPTQpIHtcbiAgICAgIGVuY29kZWQxID0gY2hhcnMuaW5kZXhPZihiYXNlNjRbaV0pO1xuICAgICAgZW5jb2RlZDIgPSBjaGFycy5pbmRleE9mKGJhc2U2NFtpKzFdKTtcbiAgICAgIGVuY29kZWQzID0gY2hhcnMuaW5kZXhPZihiYXNlNjRbaSsyXSk7XG4gICAgICBlbmNvZGVkNCA9IGNoYXJzLmluZGV4T2YoYmFzZTY0W2krM10pO1xuXG4gICAgICBieXRlc1twKytdID0gKGVuY29kZWQxIDw8IDIpIHwgKGVuY29kZWQyID4+IDQpO1xuICAgICAgYnl0ZXNbcCsrXSA9ICgoZW5jb2RlZDIgJiAxNSkgPDwgNCkgfCAoZW5jb2RlZDMgPj4gMik7XG4gICAgICBieXRlc1twKytdID0gKChlbmNvZGVkMyAmIDMpIDw8IDYpIHwgKGVuY29kZWQ0ICYgNjMpO1xuICAgIH1cblxuICAgIHJldHVybiBhcnJheWJ1ZmZlcjtcbiAgfTtcbn0pKFwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrL1wiKTtcbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qKlxuICogQ3JlYXRlIGEgYmxvYiBidWlsZGVyIGV2ZW4gd2hlbiB2ZW5kb3IgcHJlZml4ZXMgZXhpc3RcbiAqL1xuXG52YXIgQmxvYkJ1aWxkZXIgPSBnbG9iYWwuQmxvYkJ1aWxkZXJcbiAgfHwgZ2xvYmFsLldlYktpdEJsb2JCdWlsZGVyXG4gIHx8IGdsb2JhbC5NU0Jsb2JCdWlsZGVyXG4gIHx8IGdsb2JhbC5Nb3pCbG9iQnVpbGRlcjtcblxuLyoqXG4gKiBDaGVjayBpZiBCbG9iIGNvbnN0cnVjdG9yIGlzIHN1cHBvcnRlZFxuICovXG5cbnZhciBibG9iU3VwcG9ydGVkID0gKGZ1bmN0aW9uKCkge1xuICB0cnkge1xuICAgIHZhciBiID0gbmV3IEJsb2IoWydoaSddKTtcbiAgICByZXR1cm4gYi5zaXplID09IDI7XG4gIH0gY2F0Y2goZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufSkoKTtcblxuLyoqXG4gKiBDaGVjayBpZiBCbG9iQnVpbGRlciBpcyBzdXBwb3J0ZWRcbiAqL1xuXG52YXIgYmxvYkJ1aWxkZXJTdXBwb3J0ZWQgPSBCbG9iQnVpbGRlclxuICAmJiBCbG9iQnVpbGRlci5wcm90b3R5cGUuYXBwZW5kXG4gICYmIEJsb2JCdWlsZGVyLnByb3RvdHlwZS5nZXRCbG9iO1xuXG5mdW5jdGlvbiBCbG9iQnVpbGRlckNvbnN0cnVjdG9yKGFyeSwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgYmIgPSBuZXcgQmxvYkJ1aWxkZXIoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnkubGVuZ3RoOyBpKyspIHtcbiAgICBiYi5hcHBlbmQoYXJ5W2ldKTtcbiAgfVxuICByZXR1cm4gKG9wdGlvbnMudHlwZSkgPyBiYi5nZXRCbG9iKG9wdGlvbnMudHlwZSkgOiBiYi5nZXRCbG9iKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpIHtcbiAgaWYgKGJsb2JTdXBwb3J0ZWQpIHtcbiAgICByZXR1cm4gZ2xvYmFsLkJsb2I7XG4gIH0gZWxzZSBpZiAoYmxvYkJ1aWxkZXJTdXBwb3J0ZWQpIHtcbiAgICByZXR1cm4gQmxvYkJ1aWxkZXJDb25zdHJ1Y3RvcjtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59KSgpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qISBodHRwOi8vbXRocy5iZS91dGY4anMgdjIuMC4wIGJ5IEBtYXRoaWFzICovXG47KGZ1bmN0aW9uKHJvb3QpIHtcblxuXHQvLyBEZXRlY3QgZnJlZSB2YXJpYWJsZXMgYGV4cG9ydHNgXG5cdHZhciBmcmVlRXhwb3J0cyA9IHR5cGVvZiBleHBvcnRzID09ICdvYmplY3QnICYmIGV4cG9ydHM7XG5cblx0Ly8gRGV0ZWN0IGZyZWUgdmFyaWFibGUgYG1vZHVsZWBcblx0dmFyIGZyZWVNb2R1bGUgPSB0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZSAmJlxuXHRcdG1vZHVsZS5leHBvcnRzID09IGZyZWVFeHBvcnRzICYmIG1vZHVsZTtcblxuXHQvLyBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgZ2xvYmFsYCwgZnJvbSBOb2RlLmpzIG9yIEJyb3dzZXJpZmllZCBjb2RlLFxuXHQvLyBhbmQgdXNlIGl0IGFzIGByb290YFxuXHR2YXIgZnJlZUdsb2JhbCA9IHR5cGVvZiBnbG9iYWwgPT0gJ29iamVjdCcgJiYgZ2xvYmFsO1xuXHRpZiAoZnJlZUdsb2JhbC5nbG9iYWwgPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbC53aW5kb3cgPT09IGZyZWVHbG9iYWwpIHtcblx0XHRyb290ID0gZnJlZUdsb2JhbDtcblx0fVxuXG5cdC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5cdHZhciBzdHJpbmdGcm9tQ2hhckNvZGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlO1xuXG5cdC8vIFRha2VuIGZyb20gaHR0cDovL210aHMuYmUvcHVueWNvZGVcblx0ZnVuY3Rpb24gdWNzMmRlY29kZShzdHJpbmcpIHtcblx0XHR2YXIgb3V0cHV0ID0gW107XG5cdFx0dmFyIGNvdW50ZXIgPSAwO1xuXHRcdHZhciBsZW5ndGggPSBzdHJpbmcubGVuZ3RoO1xuXHRcdHZhciB2YWx1ZTtcblx0XHR2YXIgZXh0cmE7XG5cdFx0d2hpbGUgKGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdHZhbHVlID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdGlmICh2YWx1ZSA+PSAweEQ4MDAgJiYgdmFsdWUgPD0gMHhEQkZGICYmIGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHRcdFx0Ly8gaGlnaCBzdXJyb2dhdGUsIGFuZCB0aGVyZSBpcyBhIG5leHQgY2hhcmFjdGVyXG5cdFx0XHRcdGV4dHJhID0gc3RyaW5nLmNoYXJDb2RlQXQoY291bnRlcisrKTtcblx0XHRcdFx0aWYgKChleHRyYSAmIDB4RkMwMCkgPT0gMHhEQzAwKSB7IC8vIGxvdyBzdXJyb2dhdGVcblx0XHRcdFx0XHRvdXRwdXQucHVzaCgoKHZhbHVlICYgMHgzRkYpIDw8IDEwKSArIChleHRyYSAmIDB4M0ZGKSArIDB4MTAwMDApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIHVubWF0Y2hlZCBzdXJyb2dhdGU7IG9ubHkgYXBwZW5kIHRoaXMgY29kZSB1bml0LCBpbiBjYXNlIHRoZSBuZXh0XG5cdFx0XHRcdFx0Ly8gY29kZSB1bml0IGlzIHRoZSBoaWdoIHN1cnJvZ2F0ZSBvZiBhIHN1cnJvZ2F0ZSBwYWlyXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0XHRcdGNvdW50ZXItLTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0b3V0cHV0LnB1c2godmFsdWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gb3V0cHV0O1xuXHR9XG5cblx0Ly8gVGFrZW4gZnJvbSBodHRwOi8vbXRocy5iZS9wdW55Y29kZVxuXHRmdW5jdGlvbiB1Y3MyZW5jb2RlKGFycmF5KSB7XG5cdFx0dmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcblx0XHR2YXIgaW5kZXggPSAtMTtcblx0XHR2YXIgdmFsdWU7XG5cdFx0dmFyIG91dHB1dCA9ICcnO1xuXHRcdHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG5cdFx0XHR2YWx1ZSA9IGFycmF5W2luZGV4XTtcblx0XHRcdGlmICh2YWx1ZSA+IDB4RkZGRikge1xuXHRcdFx0XHR2YWx1ZSAtPSAweDEwMDAwO1xuXHRcdFx0XHRvdXRwdXQgKz0gc3RyaW5nRnJvbUNoYXJDb2RlKHZhbHVlID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKTtcblx0XHRcdFx0dmFsdWUgPSAweERDMDAgfCB2YWx1ZSAmIDB4M0ZGO1xuXHRcdFx0fVxuXHRcdFx0b3V0cHV0ICs9IHN0cmluZ0Zyb21DaGFyQ29kZSh2YWx1ZSk7XG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHQvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuXHRmdW5jdGlvbiBjcmVhdGVCeXRlKGNvZGVQb2ludCwgc2hpZnQpIHtcblx0XHRyZXR1cm4gc3RyaW5nRnJvbUNoYXJDb2RlKCgoY29kZVBvaW50ID4+IHNoaWZ0KSAmIDB4M0YpIHwgMHg4MCk7XG5cdH1cblxuXHRmdW5jdGlvbiBlbmNvZGVDb2RlUG9pbnQoY29kZVBvaW50KSB7XG5cdFx0aWYgKChjb2RlUG9pbnQgJiAweEZGRkZGRjgwKSA9PSAwKSB7IC8vIDEtYnl0ZSBzZXF1ZW5jZVxuXHRcdFx0cmV0dXJuIHN0cmluZ0Zyb21DaGFyQ29kZShjb2RlUG9pbnQpO1xuXHRcdH1cblx0XHR2YXIgc3ltYm9sID0gJyc7XG5cdFx0aWYgKChjb2RlUG9pbnQgJiAweEZGRkZGODAwKSA9PSAwKSB7IC8vIDItYnl0ZSBzZXF1ZW5jZVxuXHRcdFx0c3ltYm9sID0gc3RyaW5nRnJvbUNoYXJDb2RlKCgoY29kZVBvaW50ID4+IDYpICYgMHgxRikgfCAweEMwKTtcblx0XHR9XG5cdFx0ZWxzZSBpZiAoKGNvZGVQb2ludCAmIDB4RkZGRjAwMDApID09IDApIHsgLy8gMy1ieXRlIHNlcXVlbmNlXG5cdFx0XHRzeW1ib2wgPSBzdHJpbmdGcm9tQ2hhckNvZGUoKChjb2RlUG9pbnQgPj4gMTIpICYgMHgwRikgfCAweEUwKTtcblx0XHRcdHN5bWJvbCArPSBjcmVhdGVCeXRlKGNvZGVQb2ludCwgNik7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKChjb2RlUG9pbnQgJiAweEZGRTAwMDAwKSA9PSAwKSB7IC8vIDQtYnl0ZSBzZXF1ZW5jZVxuXHRcdFx0c3ltYm9sID0gc3RyaW5nRnJvbUNoYXJDb2RlKCgoY29kZVBvaW50ID4+IDE4KSAmIDB4MDcpIHwgMHhGMCk7XG5cdFx0XHRzeW1ib2wgKz0gY3JlYXRlQnl0ZShjb2RlUG9pbnQsIDEyKTtcblx0XHRcdHN5bWJvbCArPSBjcmVhdGVCeXRlKGNvZGVQb2ludCwgNik7XG5cdFx0fVxuXHRcdHN5bWJvbCArPSBzdHJpbmdGcm9tQ2hhckNvZGUoKGNvZGVQb2ludCAmIDB4M0YpIHwgMHg4MCk7XG5cdFx0cmV0dXJuIHN5bWJvbDtcblx0fVxuXG5cdGZ1bmN0aW9uIHV0ZjhlbmNvZGUoc3RyaW5nKSB7XG5cdFx0dmFyIGNvZGVQb2ludHMgPSB1Y3MyZGVjb2RlKHN0cmluZyk7XG5cblx0XHQvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShjb2RlUG9pbnRzLm1hcChmdW5jdGlvbih4KSB7XG5cdFx0Ly8gXHRyZXR1cm4gJ1UrJyArIHgudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCk7XG5cdFx0Ly8gfSkpKTtcblxuXHRcdHZhciBsZW5ndGggPSBjb2RlUG9pbnRzLmxlbmd0aDtcblx0XHR2YXIgaW5kZXggPSAtMTtcblx0XHR2YXIgY29kZVBvaW50O1xuXHRcdHZhciBieXRlU3RyaW5nID0gJyc7XG5cdFx0d2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcblx0XHRcdGNvZGVQb2ludCA9IGNvZGVQb2ludHNbaW5kZXhdO1xuXHRcdFx0Ynl0ZVN0cmluZyArPSBlbmNvZGVDb2RlUG9pbnQoY29kZVBvaW50KTtcblx0XHR9XG5cdFx0cmV0dXJuIGJ5dGVTdHJpbmc7XG5cdH1cblxuXHQvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuXHRmdW5jdGlvbiByZWFkQ29udGludWF0aW9uQnl0ZSgpIHtcblx0XHRpZiAoYnl0ZUluZGV4ID49IGJ5dGVDb3VudCkge1xuXHRcdFx0dGhyb3cgRXJyb3IoJ0ludmFsaWQgYnl0ZSBpbmRleCcpO1xuXHRcdH1cblxuXHRcdHZhciBjb250aW51YXRpb25CeXRlID0gYnl0ZUFycmF5W2J5dGVJbmRleF0gJiAweEZGO1xuXHRcdGJ5dGVJbmRleCsrO1xuXG5cdFx0aWYgKChjb250aW51YXRpb25CeXRlICYgMHhDMCkgPT0gMHg4MCkge1xuXHRcdFx0cmV0dXJuIGNvbnRpbnVhdGlvbkJ5dGUgJiAweDNGO1xuXHRcdH1cblxuXHRcdC8vIElmIHdlIGVuZCB1cCBoZXJlLCBpdOKAmXMgbm90IGEgY29udGludWF0aW9uIGJ5dGVcblx0XHR0aHJvdyBFcnJvcignSW52YWxpZCBjb250aW51YXRpb24gYnl0ZScpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZGVjb2RlU3ltYm9sKCkge1xuXHRcdHZhciBieXRlMTtcblx0XHR2YXIgYnl0ZTI7XG5cdFx0dmFyIGJ5dGUzO1xuXHRcdHZhciBieXRlNDtcblx0XHR2YXIgY29kZVBvaW50O1xuXG5cdFx0aWYgKGJ5dGVJbmRleCA+IGJ5dGVDb3VudCkge1xuXHRcdFx0dGhyb3cgRXJyb3IoJ0ludmFsaWQgYnl0ZSBpbmRleCcpO1xuXHRcdH1cblxuXHRcdGlmIChieXRlSW5kZXggPT0gYnl0ZUNvdW50KSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gUmVhZCBmaXJzdCBieXRlXG5cdFx0Ynl0ZTEgPSBieXRlQXJyYXlbYnl0ZUluZGV4XSAmIDB4RkY7XG5cdFx0Ynl0ZUluZGV4Kys7XG5cblx0XHQvLyAxLWJ5dGUgc2VxdWVuY2UgKG5vIGNvbnRpbnVhdGlvbiBieXRlcylcblx0XHRpZiAoKGJ5dGUxICYgMHg4MCkgPT0gMCkge1xuXHRcdFx0cmV0dXJuIGJ5dGUxO1xuXHRcdH1cblxuXHRcdC8vIDItYnl0ZSBzZXF1ZW5jZVxuXHRcdGlmICgoYnl0ZTEgJiAweEUwKSA9PSAweEMwKSB7XG5cdFx0XHR2YXIgYnl0ZTIgPSByZWFkQ29udGludWF0aW9uQnl0ZSgpO1xuXHRcdFx0Y29kZVBvaW50ID0gKChieXRlMSAmIDB4MUYpIDw8IDYpIHwgYnl0ZTI7XG5cdFx0XHRpZiAoY29kZVBvaW50ID49IDB4ODApIHtcblx0XHRcdFx0cmV0dXJuIGNvZGVQb2ludDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93IEVycm9yKCdJbnZhbGlkIGNvbnRpbnVhdGlvbiBieXRlJyk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gMy1ieXRlIHNlcXVlbmNlIChtYXkgaW5jbHVkZSB1bnBhaXJlZCBzdXJyb2dhdGVzKVxuXHRcdGlmICgoYnl0ZTEgJiAweEYwKSA9PSAweEUwKSB7XG5cdFx0XHRieXRlMiA9IHJlYWRDb250aW51YXRpb25CeXRlKCk7XG5cdFx0XHRieXRlMyA9IHJlYWRDb250aW51YXRpb25CeXRlKCk7XG5cdFx0XHRjb2RlUG9pbnQgPSAoKGJ5dGUxICYgMHgwRikgPDwgMTIpIHwgKGJ5dGUyIDw8IDYpIHwgYnl0ZTM7XG5cdFx0XHRpZiAoY29kZVBvaW50ID49IDB4MDgwMCkge1xuXHRcdFx0XHRyZXR1cm4gY29kZVBvaW50O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgRXJyb3IoJ0ludmFsaWQgY29udGludWF0aW9uIGJ5dGUnKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyA0LWJ5dGUgc2VxdWVuY2Vcblx0XHRpZiAoKGJ5dGUxICYgMHhGOCkgPT0gMHhGMCkge1xuXHRcdFx0Ynl0ZTIgPSByZWFkQ29udGludWF0aW9uQnl0ZSgpO1xuXHRcdFx0Ynl0ZTMgPSByZWFkQ29udGludWF0aW9uQnl0ZSgpO1xuXHRcdFx0Ynl0ZTQgPSByZWFkQ29udGludWF0aW9uQnl0ZSgpO1xuXHRcdFx0Y29kZVBvaW50ID0gKChieXRlMSAmIDB4MEYpIDw8IDB4MTIpIHwgKGJ5dGUyIDw8IDB4MEMpIHxcblx0XHRcdFx0KGJ5dGUzIDw8IDB4MDYpIHwgYnl0ZTQ7XG5cdFx0XHRpZiAoY29kZVBvaW50ID49IDB4MDEwMDAwICYmIGNvZGVQb2ludCA8PSAweDEwRkZGRikge1xuXHRcdFx0XHRyZXR1cm4gY29kZVBvaW50O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRocm93IEVycm9yKCdJbnZhbGlkIFVURi04IGRldGVjdGVkJyk7XG5cdH1cblxuXHR2YXIgYnl0ZUFycmF5O1xuXHR2YXIgYnl0ZUNvdW50O1xuXHR2YXIgYnl0ZUluZGV4O1xuXHRmdW5jdGlvbiB1dGY4ZGVjb2RlKGJ5dGVTdHJpbmcpIHtcblx0XHRieXRlQXJyYXkgPSB1Y3MyZGVjb2RlKGJ5dGVTdHJpbmcpO1xuXHRcdGJ5dGVDb3VudCA9IGJ5dGVBcnJheS5sZW5ndGg7XG5cdFx0Ynl0ZUluZGV4ID0gMDtcblx0XHR2YXIgY29kZVBvaW50cyA9IFtdO1xuXHRcdHZhciB0bXA7XG5cdFx0d2hpbGUgKCh0bXAgPSBkZWNvZGVTeW1ib2woKSkgIT09IGZhbHNlKSB7XG5cdFx0XHRjb2RlUG9pbnRzLnB1c2godG1wKTtcblx0XHR9XG5cdFx0cmV0dXJuIHVjczJlbmNvZGUoY29kZVBvaW50cyk7XG5cdH1cblxuXHQvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuXHR2YXIgdXRmOCA9IHtcblx0XHQndmVyc2lvbic6ICcyLjAuMCcsXG5cdFx0J2VuY29kZSc6IHV0ZjhlbmNvZGUsXG5cdFx0J2RlY29kZSc6IHV0ZjhkZWNvZGVcblx0fTtcblxuXHQvLyBTb21lIEFNRCBidWlsZCBvcHRpbWl6ZXJzLCBsaWtlIHIuanMsIGNoZWNrIGZvciBzcGVjaWZpYyBjb25kaXRpb24gcGF0dGVybnNcblx0Ly8gbGlrZSB0aGUgZm9sbG93aW5nOlxuXHRpZiAoXG5cdFx0dHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmXG5cdFx0dHlwZW9mIGRlZmluZS5hbWQgPT0gJ29iamVjdCcgJiZcblx0XHRkZWZpbmUuYW1kXG5cdCkge1xuXHRcdGRlZmluZShmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB1dGY4O1xuXHRcdH0pO1xuXHR9XHRlbHNlIGlmIChmcmVlRXhwb3J0cyAmJiAhZnJlZUV4cG9ydHMubm9kZVR5cGUpIHtcblx0XHRpZiAoZnJlZU1vZHVsZSkgeyAvLyBpbiBOb2RlLmpzIG9yIFJpbmdvSlMgdjAuOC4wK1xuXHRcdFx0ZnJlZU1vZHVsZS5leHBvcnRzID0gdXRmODtcblx0XHR9IGVsc2UgeyAvLyBpbiBOYXJ3aGFsIG9yIFJpbmdvSlMgdjAuNy4wLVxuXHRcdFx0dmFyIG9iamVjdCA9IHt9O1xuXHRcdFx0dmFyIGhhc093blByb3BlcnR5ID0gb2JqZWN0Lmhhc093blByb3BlcnR5O1xuXHRcdFx0Zm9yICh2YXIga2V5IGluIHV0ZjgpIHtcblx0XHRcdFx0aGFzT3duUHJvcGVydHkuY2FsbCh1dGY4LCBrZXkpICYmIChmcmVlRXhwb3J0c1trZXldID0gdXRmOFtrZXldKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gZWxzZSB7IC8vIGluIFJoaW5vIG9yIGEgd2ViIGJyb3dzZXJcblx0XHRyb290LnV0ZjggPSB1dGY4O1xuXHR9XG5cbn0odGhpcykpO1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIlxuLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBnbG9iYWwgPSByZXF1aXJlKCdnbG9iYWwnKTtcblxuLyoqXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqXG4gKiBMb2dpYyBib3Jyb3dlZCBmcm9tIE1vZGVybml6cjpcbiAqXG4gKiAgIC0gaHR0cHM6Ly9naXRodWIuY29tL01vZGVybml6ci9Nb2Rlcm5penIvYmxvYi9tYXN0ZXIvZmVhdHVyZS1kZXRlY3RzL2NvcnMuanNcbiAqL1xuXG50cnkge1xuICBtb2R1bGUuZXhwb3J0cyA9ICdYTUxIdHRwUmVxdWVzdCcgaW4gZ2xvYmFsICYmXG4gICAgJ3dpdGhDcmVkZW50aWFscycgaW4gbmV3IGdsb2JhbC5YTUxIdHRwUmVxdWVzdCgpO1xufSBjYXRjaCAoZXJyKSB7XG4gIC8vIGlmIFhNTEh0dHAgc3VwcG9ydCBpcyBkaXNhYmxlZCBpbiBJRSB0aGVuIGl0IHdpbGwgdGhyb3dcbiAgLy8gd2hlbiB0cnlpbmcgdG8gY3JlYXRlXG4gIG1vZHVsZS5leHBvcnRzID0gZmFsc2U7XG59XG4iLCJcbi8qKlxuICogUmV0dXJucyBgdGhpc2AuIEV4ZWN1dGUgdGhpcyB3aXRob3V0IGEgXCJjb250ZXh0XCIgKGkuZS4gd2l0aG91dCBpdCBiZWluZ1xuICogYXR0YWNoZWQgdG8gYW4gb2JqZWN0IG9mIHRoZSBsZWZ0LWhhbmQgc2lkZSksIGFuZCBgdGhpc2AgcG9pbnRzIHRvIHRoZVxuICogXCJnbG9iYWxcIiBzY29wZSBvZiB0aGUgY3VycmVudCBKUyBleGVjdXRpb24uXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSkoKTtcbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLyoqXG4gKiBKU09OIHBhcnNlLlxuICpcbiAqIEBzZWUgQmFzZWQgb24galF1ZXJ5I3BhcnNlSlNPTiAoTUlUKSBhbmQgSlNPTjJcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbnZhciBydmFsaWRjaGFycyA9IC9eW1xcXSw6e31cXHNdKiQvO1xudmFyIHJ2YWxpZGVzY2FwZSA9IC9cXFxcKD86W1wiXFxcXFxcL2JmbnJ0XXx1WzAtOWEtZkEtRl17NH0pL2c7XG52YXIgcnZhbGlkdG9rZW5zID0gL1wiW15cIlxcXFxcXG5cXHJdKlwifHRydWV8ZmFsc2V8bnVsbHwtP1xcZCsoPzpcXC5cXGQqKT8oPzpbZUVdWytcXC1dP1xcZCspPy9nO1xudmFyIHJ2YWxpZGJyYWNlcyA9IC8oPzpefDp8LCkoPzpcXHMqXFxbKSsvZztcbnZhciBydHJpbUxlZnQgPSAvXlxccysvO1xudmFyIHJ0cmltUmlnaHQgPSAvXFxzKyQvO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhcnNlanNvbihkYXRhKSB7XG4gIGlmICgnc3RyaW5nJyAhPSB0eXBlb2YgZGF0YSB8fCAhZGF0YSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgZGF0YSA9IGRhdGEucmVwbGFjZShydHJpbUxlZnQsICcnKS5yZXBsYWNlKHJ0cmltUmlnaHQsICcnKTtcblxuICAvLyBBdHRlbXB0IHRvIHBhcnNlIHVzaW5nIHRoZSBuYXRpdmUgSlNPTiBwYXJzZXIgZmlyc3RcbiAgaWYgKGdsb2JhbC5KU09OICYmIEpTT04ucGFyc2UpIHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShkYXRhKTtcbiAgfVxuXG4gIGlmIChydmFsaWRjaGFycy50ZXN0KGRhdGEucmVwbGFjZShydmFsaWRlc2NhcGUsICdAJylcbiAgICAgIC5yZXBsYWNlKHJ2YWxpZHRva2VucywgJ10nKVxuICAgICAgLnJlcGxhY2UocnZhbGlkYnJhY2VzLCAnJykpKSB7XG4gICAgcmV0dXJuIChuZXcgRnVuY3Rpb24oJ3JldHVybiAnICsgZGF0YSkpKCk7XG4gIH1cbn07XG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIi8qKlxuICogQ29tcGlsZXMgYSBxdWVyeXN0cmluZ1xuICogUmV0dXJucyBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIG9iamVjdFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5lbmNvZGUgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciBzdHIgPSAnJztcblxuICBmb3IgKHZhciBpIGluIG9iaikge1xuICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgIGlmIChzdHIubGVuZ3RoKSBzdHIgKz0gJyYnO1xuICAgICAgc3RyICs9IGVuY29kZVVSSUNvbXBvbmVudChpKSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChvYmpbaV0pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBzdHI7XG59O1xuXG4vKipcbiAqIFBhcnNlcyBhIHNpbXBsZSBxdWVyeXN0cmluZyBpbnRvIGFuIG9iamVjdFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBxc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5kZWNvZGUgPSBmdW5jdGlvbihxcyl7XG4gIHZhciBxcnkgPSB7fTtcbiAgdmFyIHBhaXJzID0gcXMuc3BsaXQoJyYnKTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBwYWlycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgcGFpciA9IHBhaXJzW2ldLnNwbGl0KCc9Jyk7XG4gICAgcXJ5W2RlY29kZVVSSUNvbXBvbmVudChwYWlyWzBdKV0gPSBkZWNvZGVVUklDb21wb25lbnQocGFpclsxXSk7XG4gIH1cbiAgcmV0dXJuIHFyeTtcbn07XG4iLCJcbi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgZ2xvYmFsID0gKGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSkoKTtcblxuLyoqXG4gKiBXZWJTb2NrZXQgY29uc3RydWN0b3IuXG4gKi9cblxudmFyIFdlYlNvY2tldCA9IGdsb2JhbC5XZWJTb2NrZXQgfHwgZ2xvYmFsLk1veldlYlNvY2tldDtcblxuLyoqXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFdlYlNvY2tldCA/IHdzIDogbnVsbDtcblxuLyoqXG4gKiBXZWJTb2NrZXQgY29uc3RydWN0b3IuXG4gKlxuICogVGhlIHRoaXJkIGBvcHRzYCBvcHRpb25zIG9iamVjdCBnZXRzIGlnbm9yZWQgaW4gd2ViIGJyb3dzZXJzLCBzaW5jZSBpdCdzXG4gKiBub24tc3RhbmRhcmQsIGFuZCB0aHJvd3MgYSBUeXBlRXJyb3IgaWYgcGFzc2VkIHRvIHRoZSBjb25zdHJ1Y3Rvci5cbiAqIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2VpbmFyb3Mvd3MvaXNzdWVzLzIyN1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmlcbiAqIEBwYXJhbSB7QXJyYXl9IHByb3RvY29scyAob3B0aW9uYWwpXG4gKiBAcGFyYW0ge09iamVjdCkgb3B0cyAob3B0aW9uYWwpXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIHdzKHVyaSwgcHJvdG9jb2xzLCBvcHRzKSB7XG4gIHZhciBpbnN0YW5jZTtcbiAgaWYgKHByb3RvY29scykge1xuICAgIGluc3RhbmNlID0gbmV3IFdlYlNvY2tldCh1cmksIHByb3RvY29scyk7XG4gIH0gZWxzZSB7XG4gICAgaW5zdGFuY2UgPSBuZXcgV2ViU29ja2V0KHVyaSk7XG4gIH1cbiAgcmV0dXJuIGluc3RhbmNlO1xufVxuXG5pZiAoV2ViU29ja2V0KSB3cy5wcm90b3R5cGUgPSBXZWJTb2NrZXQucHJvdG90eXBlO1xuIiwiKGZ1bmN0aW9uIChnbG9iYWwsQnVmZmVyKXtcbi8qXG4gKiBNb2R1bGUgcmVxdWlyZW1lbnRzLlxuICovXG5cbnZhciBpc0FycmF5ID0gcmVxdWlyZSgnaXNhcnJheScpO1xuXG4vKipcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gaGFzQmluYXJ5O1xuXG4vKipcbiAqIENoZWNrcyBmb3IgYmluYXJ5IGRhdGEuXG4gKlxuICogUmlnaHQgbm93IG9ubHkgQnVmZmVyIGFuZCBBcnJheUJ1ZmZlciBhcmUgc3VwcG9ydGVkLi5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gYW55dGhpbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gaGFzQmluYXJ5KGRhdGEpIHtcblxuICBmdW5jdGlvbiByZWN1cnNpdmVDaGVja0ZvckJpbmFyeShvYmopIHsgXG4gICAgaWYgKCFvYmopIHJldHVybiBmYWxzZTtcblxuICAgIGlmICggKGdsb2JhbC5CdWZmZXIgJiYgQnVmZmVyLmlzQnVmZmVyKG9iaikpIHx8XG4gICAgICAgICAoZ2xvYmFsLkFycmF5QnVmZmVyICYmIG9iaiBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB8fFxuICAgICAgICAgKGdsb2JhbC5CbG9iICYmIG9iaiBpbnN0YW5jZW9mIEJsb2IpIHx8XG4gICAgICAgICAoZ2xvYmFsLkZpbGUgJiYgb2JqIGluc3RhbmNlb2YgRmlsZSlcbiAgICAgICAgKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iai5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChyZWN1cnNpdmVDaGVja0ZvckJpbmFyeShvYmpbaV0pKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG9iaiAmJiAnb2JqZWN0JyA9PSB0eXBlb2Ygb2JqKSB7XG4gICAgICBpZiAob2JqLnRvSlNPTikge1xuICAgICAgICBvYmogPSBvYmoudG9KU09OKCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKHJlY3Vyc2l2ZUNoZWNrRm9yQmluYXJ5KG9ialtrZXldKSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHJlY3Vyc2l2ZUNoZWNrRm9yQmluYXJ5KGRhdGEpO1xufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyKSIsIm1vZHVsZS5leHBvcnRzID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoYXJyKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIlxudmFyIGluZGV4T2YgPSBbXS5pbmRleE9mO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFyciwgb2JqKXtcbiAgaWYgKGluZGV4T2YpIHJldHVybiBhcnIuaW5kZXhPZihvYmopO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7ICsraSkge1xuICAgIGlmIChhcnJbaV0gPT09IG9iaikgcmV0dXJuIGk7XG4gIH1cbiAgcmV0dXJuIC0xO1xufTsiLCJcbi8qKlxuICogSE9QIHJlZi5cbiAqL1xuXG52YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLyoqXG4gKiBSZXR1cm4gb3duIGtleXMgaW4gYG9iamAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmV4cG9ydHMua2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uKG9iail7XG4gIHZhciBrZXlzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICBpZiAoaGFzLmNhbGwob2JqLCBrZXkpKSB7XG4gICAgICBrZXlzLnB1c2goa2V5KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGtleXM7XG59O1xuXG4vKipcbiAqIFJldHVybiBvd24gdmFsdWVzIGluIGBvYmpgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5leHBvcnRzLnZhbHVlcyA9IGZ1bmN0aW9uKG9iail7XG4gIHZhciB2YWxzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICBpZiAoaGFzLmNhbGwob2JqLCBrZXkpKSB7XG4gICAgICB2YWxzLnB1c2gob2JqW2tleV0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmFscztcbn07XG5cbi8qKlxuICogTWVyZ2UgYGJgIGludG8gYGFgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBhXG4gKiBAcGFyYW0ge09iamVjdH0gYlxuICogQHJldHVybiB7T2JqZWN0fSBhXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmV4cG9ydHMubWVyZ2UgPSBmdW5jdGlvbihhLCBiKXtcbiAgZm9yICh2YXIga2V5IGluIGIpIHtcbiAgICBpZiAoaGFzLmNhbGwoYiwga2V5KSkge1xuICAgICAgYVtrZXldID0gYltrZXldO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGxlbmd0aCBvZiBgb2JqYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmV4cG9ydHMubGVuZ3RoID0gZnVuY3Rpb24ob2JqKXtcbiAgcmV0dXJuIGV4cG9ydHMua2V5cyhvYmopLmxlbmd0aDtcbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgYG9iamAgaXMgZW1wdHkuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZXhwb3J0cy5pc0VtcHR5ID0gZnVuY3Rpb24ob2JqKXtcbiAgcmV0dXJuIDAgPT0gZXhwb3J0cy5sZW5ndGgob2JqKTtcbn07IiwiLyoqXG4gKiBQYXJzZXMgYW4gVVJJXG4gKlxuICogQGF1dGhvciBTdGV2ZW4gTGV2aXRoYW4gPHN0ZXZlbmxldml0aGFuLmNvbT4gKE1JVCBsaWNlbnNlKVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxudmFyIHJlID0gL14oPzooPyFbXjpAXSs6W146QFxcL10qQCkoaHR0cHxodHRwc3x3c3x3c3MpOlxcL1xcLyk/KCg/OigoW146QF0qKSg/OjooW146QF0qKSk/KT9AKT8oKD86W2EtZjAtOV17MCw0fTopezIsN31bYS1mMC05XXswLDR9fFteOlxcLz8jXSopKD86OihcXGQqKSk/KSgoKFxcLyg/OltePyNdKD8hW14/I1xcL10qXFwuW14/I1xcLy5dKyg/Ols/I118JCkpKSpcXC8/KT8oW14/I1xcL10qKSkoPzpcXD8oW14jXSopKT8oPzojKC4qKSk/KS87XG5cbnZhciBwYXJ0cyA9IFtcbiAgICAnc291cmNlJywgJ3Byb3RvY29sJywgJ2F1dGhvcml0eScsICd1c2VySW5mbycsICd1c2VyJywgJ3Bhc3N3b3JkJywgJ2hvc3QnXG4gICwgJ3BvcnQnLCAncmVsYXRpdmUnLCAncGF0aCcsICdkaXJlY3RvcnknLCAnZmlsZScsICdxdWVyeScsICdhbmNob3InXG5dO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhcnNldXJpKHN0cikge1xuICB2YXIgbSA9IHJlLmV4ZWMoc3RyIHx8ICcnKVxuICAgICwgdXJpID0ge31cbiAgICAsIGkgPSAxNDtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAgdXJpW3BhcnRzW2ldXSA9IG1baV0gfHwgJyc7XG4gIH1cblxuICByZXR1cm4gdXJpO1xufTtcbiIsIihmdW5jdGlvbiAoZ2xvYmFsLEJ1ZmZlcil7XG4vKipcbiAqIE1vZGxlIHJlcXVpcmVtZW50c1xuICovXG5cbnZhciBpc0FycmF5ID0gcmVxdWlyZSgnaXNhcnJheScpO1xuXG4vKipcbiAqIFJlcGxhY2VzIGV2ZXJ5IEJ1ZmZlciB8IEFycmF5QnVmZmVyIGluIHBhY2tldCB3aXRoIGEgbnVtYmVyZWQgcGxhY2Vob2xkZXIuXG4gKiBBbnl0aGluZyB3aXRoIGJsb2JzIG9yIGZpbGVzIHNob3VsZCBiZSBmZWQgdGhyb3VnaCByZW1vdmVCbG9icyBiZWZvcmUgY29taW5nXG4gKiBoZXJlLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBwYWNrZXQgLSBzb2NrZXQuaW8gZXZlbnQgcGFja2V0XG4gKiBAcmV0dXJuIHtPYmplY3R9IHdpdGggZGVjb25zdHJ1Y3RlZCBwYWNrZXQgYW5kIGxpc3Qgb2YgYnVmZmVyc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5leHBvcnRzLmRlY29uc3RydWN0UGFja2V0ID0gZnVuY3Rpb24ocGFja2V0KSB7XG4gICAgdmFyIGJ1ZmZlcnMgPSBbXTtcbiAgICB2YXIgcGFja2V0RGF0YSA9IHBhY2tldC5kYXRhO1xuXG4gICAgZnVuY3Rpb24gZGVjb25zdHJ1Y3RCaW5QYWNrUmVjdXJzaXZlKGRhdGEpIHtcbiAgICAgICAgaWYgKCFkYXRhKSByZXR1cm4gZGF0YTtcblxuICAgICAgICBpZiAoKGdsb2JhbC5CdWZmZXIgJiYgQnVmZmVyLmlzQnVmZmVyKGRhdGEpKSB8fFxuICAgICAgICAgICAgKGdsb2JhbC5BcnJheUJ1ZmZlciAmJiBkYXRhIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpKSB7IC8vIHJlcGxhY2UgYmluYXJ5XG4gICAgICAgICAgICB2YXIgcGxhY2Vob2xkZXIgPSB7X3BsYWNlaG9sZGVyOiB0cnVlLCBudW06IGJ1ZmZlcnMubGVuZ3RofTtcbiAgICAgICAgICAgIGJ1ZmZlcnMucHVzaChkYXRhKTtcbiAgICAgICAgICAgIHJldHVybiBwbGFjZWhvbGRlcjtcbiAgICAgICAgfSBlbHNlIGlmIChpc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICB2YXIgbmV3RGF0YSA9IG5ldyBBcnJheShkYXRhLmxlbmd0aCk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBuZXdEYXRhW2ldID0gZGVjb25zdHJ1Y3RCaW5QYWNrUmVjdXJzaXZlKGRhdGFbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5ld0RhdGE7XG4gICAgICAgIH0gZWxzZSBpZiAoJ29iamVjdCcgPT0gdHlwZW9mIGRhdGEgJiYgIShkYXRhIGluc3RhbmNlb2YgRGF0ZSkpIHtcbiAgICAgICAgICAgIHZhciBuZXdEYXRhID0ge307XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gZGF0YSkge1xuICAgICAgICAgICAgICAgIG5ld0RhdGFba2V5XSA9IGRlY29uc3RydWN0QmluUGFja1JlY3Vyc2l2ZShkYXRhW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5ld0RhdGE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgdmFyIHBhY2sgPSBwYWNrZXQ7XG4gICAgcGFjay5kYXRhID0gZGVjb25zdHJ1Y3RCaW5QYWNrUmVjdXJzaXZlKHBhY2tldERhdGEpO1xuICAgIHBhY2suYXR0YWNobWVudHMgPSBidWZmZXJzLmxlbmd0aDsgLy8gbnVtYmVyIG9mIGJpbmFyeSAnYXR0YWNobWVudHMnXG4gICAgcmV0dXJuIHtwYWNrZXQ6IHBhY2ssIGJ1ZmZlcnM6IGJ1ZmZlcnN9O1xufVxuXG4vKipcbiAqIFJlY29uc3RydWN0cyBhIGJpbmFyeSBwYWNrZXQgZnJvbSBpdHMgcGxhY2Vob2xkZXIgcGFja2V0IGFuZCBidWZmZXJzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHBhY2tldCAtIGV2ZW50IHBhY2tldCB3aXRoIHBsYWNlaG9sZGVyc1xuICogQHBhcmFtIHtBcnJheX0gYnVmZmVycyAtIGJpbmFyeSBidWZmZXJzIHRvIHB1dCBpbiBwbGFjZWhvbGRlciBwb3NpdGlvbnNcbiAqIEByZXR1cm4ge09iamVjdH0gcmVjb25zdHJ1Y3RlZCBwYWNrZXRcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuIGV4cG9ydHMucmVjb25zdHJ1Y3RQYWNrZXQgPSBmdW5jdGlvbihwYWNrZXQsIGJ1ZmZlcnMpIHtcbiAgICB2YXIgY3VyUGxhY2VIb2xkZXIgPSAwO1xuXG4gICAgZnVuY3Rpb24gcmVjb25zdHJ1Y3RCaW5QYWNrUmVjdXJzaXZlKGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS5fcGxhY2Vob2xkZXIpIHtcbiAgICAgICAgICAgIHZhciBidWYgPSBidWZmZXJzW2RhdGEubnVtXTsgLy8gYXBwcm9wcmlhdGUgYnVmZmVyIChzaG91bGQgYmUgbmF0dXJhbCBvcmRlciBhbnl3YXkpXG4gICAgICAgICAgICByZXR1cm4gYnVmO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGRhdGFbaV0gPSByZWNvbnN0cnVjdEJpblBhY2tSZWN1cnNpdmUoZGF0YVtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfSBlbHNlIGlmIChkYXRhICYmICdvYmplY3QnID09IHR5cGVvZiBkYXRhKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gZGF0YSkge1xuICAgICAgICAgICAgICAgIGRhdGFba2V5XSA9IHJlY29uc3RydWN0QmluUGFja1JlY3Vyc2l2ZShkYXRhW2tleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgcGFja2V0LmRhdGEgPSByZWNvbnN0cnVjdEJpblBhY2tSZWN1cnNpdmUocGFja2V0LmRhdGEpO1xuICAgIHBhY2tldC5hdHRhY2htZW50cyA9IHVuZGVmaW5lZDsgLy8gbm8gbG9uZ2VyIHVzZWZ1bFxuICAgIHJldHVybiBwYWNrZXQ7XG4gfVxuXG4vKipcbiAqIEFzeW5jaHJvbm91c2x5IHJlbW92ZXMgQmxvYnMgb3IgRmlsZXMgZnJvbSBkYXRhIHZpYVxuICogRmlsZVJlYWRlcidzIHJlYWRBc0FycmF5QnVmZmVyIG1ldGhvZC4gVXNlZCBiZWZvcmUgZW5jb2RpbmdcbiAqIGRhdGEgYXMgbXNncGFjay4gQ2FsbHMgY2FsbGJhY2sgd2l0aCB0aGUgYmxvYmxlc3MgZGF0YS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YVxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMucmVtb3ZlQmxvYnMgPSBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykge1xuXG4gIGZ1bmN0aW9uIHJlbW92ZUJsb2JzUmVjdXJzaXZlKG9iaiwgY3VyS2V5LCBjb250YWluaW5nT2JqZWN0KSB7XG4gICAgaWYgKCFvYmopIHJldHVybiBvYmo7XG5cbiAgICAvLyBjb252ZXJ0IGFueSBibG9iXG4gICAgaWYgKChnbG9iYWwuQmxvYiAmJiBvYmogaW5zdGFuY2VvZiBCbG9iKSB8fFxuICAgICAgICAoZ2xvYmFsLkZpbGUgJiYgb2JqIGluc3RhbmNlb2YgRmlsZSkpIHtcbiAgICAgIHBlbmRpbmdCbG9icysrO1xuXG4gICAgICAvLyBhc3luYyBmaWxlcmVhZGVyXG4gICAgICB2YXIgZmlsZVJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICBmaWxlUmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKCkgeyAvLyB0aGlzLnJlc3VsdCA9PSBhcnJheWJ1ZmZlclxuICAgICAgICBpZiAoY29udGFpbmluZ09iamVjdCkge1xuICAgICAgICAgIGNvbnRhaW5pbmdPYmplY3RbY3VyS2V5XSA9IHRoaXMucmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGJsb2JsZXNzRGF0YSA9IHRoaXMucmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgbm90aGluZyBwZW5kaW5nIGl0cyBjYWxsYmFjayB0aW1lXG4gICAgICAgIGlmKCEgLS1wZW5kaW5nQmxvYnMpIHtcbiAgICAgICAgICBjYWxsYmFjayhibG9ibGVzc0RhdGEpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBmaWxlUmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKG9iaik7IC8vIGJsb2IgLT4gYXJyYXlidWZmZXJcbiAgICB9XG5cbiAgICBpZiAoaXNBcnJheShvYmopKSB7IC8vIGhhbmRsZSBhcnJheVxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcmVtb3ZlQmxvYnNSZWN1cnNpdmUob2JqW2ldLCBpLCBvYmopO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAob2JqICYmICdvYmplY3QnID09IHR5cGVvZiBvYmogJiYgIWlzQnVmKG9iaikpIHsgLy8gYW5kIG9iamVjdFxuICAgICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICByZW1vdmVCbG9ic1JlY3Vyc2l2ZShvYmpba2V5XSwga2V5LCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZhciBwZW5kaW5nQmxvYnMgPSAwO1xuICB2YXIgYmxvYmxlc3NEYXRhID0gZGF0YTtcbiAgcmVtb3ZlQmxvYnNSZWN1cnNpdmUoYmxvYmxlc3NEYXRhKTtcbiAgaWYgKCFwZW5kaW5nQmxvYnMpIHtcbiAgICBjYWxsYmFjayhibG9ibGVzc0RhdGEpO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIG9iaiBpcyBhIGJ1ZmZlciBvciBhbiBhcnJheWJ1ZmZlci5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gaXNCdWYob2JqKSB7XG4gIHJldHVybiAoZ2xvYmFsLkJ1ZmZlciAmJiBCdWZmZXIuaXNCdWZmZXIob2JqKSkgfHxcbiAgICAgICAgIChnbG9iYWwuQXJyYXlCdWZmZXIgJiYgb2JqIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpO1xufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyKSIsIihmdW5jdGlvbiAoZ2xvYmFsLEJ1ZmZlcil7XG5cbi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdzb2NrZXQuaW8tcGFyc2VyJyk7XG52YXIganNvbiA9IHJlcXVpcmUoJ2pzb24zJyk7XG52YXIgaXNBcnJheSA9IHJlcXVpcmUoJ2lzYXJyYXknKTtcbnZhciBFbWl0dGVyID0gcmVxdWlyZSgnZW1pdHRlcicpO1xudmFyIGJpbmFyeSA9IHJlcXVpcmUoJy4vYmluYXJ5Jyk7XG5cbi8qKlxuICogUHJvdG9jb2wgdmVyc2lvbi5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmV4cG9ydHMucHJvdG9jb2wgPSAzO1xuXG4vKipcbiAqIFBhY2tldCB0eXBlcy5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmV4cG9ydHMudHlwZXMgPSBbXG4gICdDT05ORUNUJyxcbiAgJ0RJU0NPTk5FQ1QnLFxuICAnRVZFTlQnLFxuICAnQklOQVJZX0VWRU5UJyxcbiAgJ0FDSycsXG4gICdFUlJPUidcbl07XG5cbi8qKlxuICogUGFja2V0IHR5cGUgYGNvbm5lY3RgLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZXhwb3J0cy5DT05ORUNUID0gMDtcblxuLyoqXG4gKiBQYWNrZXQgdHlwZSBgZGlzY29ubmVjdGAuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5leHBvcnRzLkRJU0NPTk5FQ1QgPSAxO1xuXG4vKipcbiAqIFBhY2tldCB0eXBlIGBldmVudGAuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5leHBvcnRzLkVWRU5UID0gMjtcblxuLyoqXG4gKiBQYWNrZXQgdHlwZSBgYWNrYC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmV4cG9ydHMuQUNLID0gMztcblxuLyoqXG4gKiBQYWNrZXQgdHlwZSBgZXJyb3JgLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZXhwb3J0cy5FUlJPUiA9IDQ7XG5cbi8qKlxuICogUGFja2V0IHR5cGUgJ2JpbmFyeSBldmVudCdcbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmV4cG9ydHMuQklOQVJZX0VWRU5UID0gNTtcblxuZXhwb3J0cy5FbmNvZGVyID0gRW5jb2RlclxuXG4vKipcbiAqIEEgc29ja2V0LmlvIEVuY29kZXIgaW5zdGFuY2VcbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5mdW5jdGlvbiBFbmNvZGVyKCkge307XG5cbi8qKlxuICogRW5jb2RlIGEgcGFja2V0IGFzIGEgc2luZ2xlIHN0cmluZyBpZiBub24tYmluYXJ5LCBvciBhcyBhXG4gKiBidWZmZXIgc2VxdWVuY2UsIGRlcGVuZGluZyBvbiBwYWNrZXQgdHlwZS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gcGFja2V0IG9iamVjdFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBmdW5jdGlvbiB0byBoYW5kbGUgZW5jb2RpbmdzIChsaWtlbHkgZW5naW5lLndyaXRlKVxuICogQHJldHVybiBDYWxscyBjYWxsYmFjayB3aXRoIEFycmF5IG9mIGVuY29kaW5nc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbmNvZGVyLnByb3RvdHlwZS5lbmNvZGUgPSBmdW5jdGlvbihvYmosIGNhbGxiYWNrKXtcbiAgZGVidWcoJ2VuY29kaW5nIHBhY2tldCAlaicsIG9iaik7XG5cbiAgaWYgKGV4cG9ydHMuQklOQVJZX0VWRU5UID09IG9iai50eXBlIHx8IGV4cG9ydHMuQUNLID09IG9iai50eXBlKSB7XG4gICAgZW5jb2RlQXNCaW5hcnkob2JqLCBjYWxsYmFjayk7XG4gIH1cbiAgZWxzZSB7XG4gICAgdmFyIGVuY29kaW5nID0gZW5jb2RlQXNTdHJpbmcob2JqKTtcbiAgICBjYWxsYmFjayhbZW5jb2RpbmddKTtcbiAgfVxufTtcblxuLyoqXG4gKiBFbmNvZGUgcGFja2V0IGFzIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gcGFja2V0XG4gKiBAcmV0dXJuIHtTdHJpbmd9IGVuY29kZWRcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGVuY29kZUFzU3RyaW5nKG9iaikge1xuICB2YXIgc3RyID0gJyc7XG4gIHZhciBuc3AgPSBmYWxzZTtcblxuICAvLyBmaXJzdCBpcyB0eXBlXG4gIHN0ciArPSBvYmoudHlwZTtcblxuICAvLyBhdHRhY2htZW50cyBpZiB3ZSBoYXZlIHRoZW1cbiAgaWYgKGV4cG9ydHMuQklOQVJZX0VWRU5UID09IG9iai50eXBlIHx8IGV4cG9ydHMuQUNLID09IG9iai50eXBlKSB7XG4gICAgc3RyICs9IG9iai5hdHRhY2htZW50cztcbiAgICBzdHIgKz0gJy0nO1xuICB9XG5cbiAgLy8gaWYgd2UgaGF2ZSBhIG5hbWVzcGFjZSBvdGhlciB0aGFuIGAvYFxuICAvLyB3ZSBhcHBlbmQgaXQgZm9sbG93ZWQgYnkgYSBjb21tYSBgLGBcbiAgaWYgKG9iai5uc3AgJiYgJy8nICE9IG9iai5uc3ApIHtcbiAgICBuc3AgPSB0cnVlO1xuICAgIHN0ciArPSBvYmoubnNwO1xuICB9XG5cbiAgLy8gaW1tZWRpYXRlbHkgZm9sbG93ZWQgYnkgdGhlIGlkXG4gIGlmIChudWxsICE9IG9iai5pZCkge1xuICAgIGlmIChuc3ApIHtcbiAgICAgIHN0ciArPSAnLCc7XG4gICAgICBuc3AgPSBmYWxzZTtcbiAgICB9XG4gICAgc3RyICs9IG9iai5pZDtcbiAgfVxuXG4gIC8vIGpzb24gZGF0YVxuICBpZiAobnVsbCAhPSBvYmouZGF0YSkge1xuICAgIGlmIChuc3ApIHN0ciArPSAnLCc7XG4gICAgc3RyICs9IGpzb24uc3RyaW5naWZ5KG9iai5kYXRhKTtcbiAgfVxuXG4gIGRlYnVnKCdlbmNvZGVkICVqIGFzICVzJywgb2JqLCBzdHIpO1xuICByZXR1cm4gc3RyO1xufVxuXG4vKipcbiAqIEVuY29kZSBwYWNrZXQgYXMgJ2J1ZmZlciBzZXF1ZW5jZScgYnkgcmVtb3ZpbmcgYmxvYnMsIGFuZFxuICogZGVjb25zdHJ1Y3RpbmcgcGFja2V0IGludG8gb2JqZWN0IHdpdGggcGxhY2Vob2xkZXJzIGFuZFxuICogYSBsaXN0IG9mIGJ1ZmZlcnMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHBhY2tldFxuICogQHJldHVybiB7QnVmZmVyfSBlbmNvZGVkXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBlbmNvZGVBc0JpbmFyeShvYmosIGNhbGxiYWNrKSB7XG5cbiAgZnVuY3Rpb24gd3JpdGVFbmNvZGluZyhibG9ibGVzc0RhdGEpIHtcbiAgICB2YXIgZGVjb25zdHJ1Y3Rpb24gPSBiaW5hcnkuZGVjb25zdHJ1Y3RQYWNrZXQoYmxvYmxlc3NEYXRhKTtcbiAgICB2YXIgcGFjayA9IGVuY29kZUFzU3RyaW5nKGRlY29uc3RydWN0aW9uLnBhY2tldCk7XG4gICAgdmFyIGJ1ZmZlcnMgPSBkZWNvbnN0cnVjdGlvbi5idWZmZXJzO1xuXG4gICAgYnVmZmVycy51bnNoaWZ0KHBhY2spOyAvLyBhZGQgcGFja2V0IGluZm8gdG8gYmVnaW5uaW5nIG9mIGRhdGEgbGlzdFxuICAgIGNhbGxiYWNrKGJ1ZmZlcnMpOyAvLyB3cml0ZSBhbGwgdGhlIGJ1ZmZlcnNcbiAgfVxuXG4gIGJpbmFyeS5yZW1vdmVCbG9icyhvYmosIHdyaXRlRW5jb2RpbmcpO1xufVxuXG5leHBvcnRzLkRlY29kZXIgPSBEZWNvZGVyXG5cbi8qKlxuICogQSBzb2NrZXQuaW8gRGVjb2RlciBpbnN0YW5jZVxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gZGVjb2RlclxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBEZWNvZGVyKCkge1xuICB0aGlzLnJlY29uc3RydWN0b3IgPSBudWxsO1xufVxuXG4vKipcbiAqIE1peCBpbiBgRW1pdHRlcmAgd2l0aCBEZWNvZGVyLlxuICovXG5cbkVtaXR0ZXIoRGVjb2Rlci5wcm90b3R5cGUpO1xuXG4vKipcbiAqIERlY29kZXMgYW4gZWNvZGVkIHBhY2tldCBzdHJpbmcgaW50byBwYWNrZXQgSlNPTi5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gb2JqIC0gZW5jb2RlZCBwYWNrZXRcbiAqIEByZXR1cm4ge09iamVjdH0gcGFja2V0XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkRlY29kZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKG9iaikge1xuICB2YXIgcGFja2V0O1xuICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIG9iaikge1xuICAgIHBhY2tldCA9IGRlY29kZVN0cmluZyhvYmopO1xuICAgIGlmIChleHBvcnRzLkJJTkFSWV9FVkVOVCA9PSBwYWNrZXQudHlwZSB8fCBleHBvcnRzLkFDSyA9PSBwYWNrZXQudHlwZSkgeyAvLyBiaW5hcnkgcGFja2V0J3MganNvblxuICAgICAgdGhpcy5yZWNvbnN0cnVjdG9yID0gbmV3IEJpbmFyeVJlY29uc3RydWN0b3IocGFja2V0KTtcblxuICAgICAgLy8gbm8gYXR0YWNobWVudHMsIGxhYmVsZWQgYmluYXJ5IGJ1dCBubyBiaW5hcnkgZGF0YSB0byBmb2xsb3dcbiAgICAgIGlmICh0aGlzLnJlY29uc3RydWN0b3IucmVjb25QYWNrLmF0dGFjaG1lbnRzID09IDApIHtcbiAgICAgICAgdGhpcy5lbWl0KCdkZWNvZGVkJywgcGFja2V0KTtcbiAgICAgIH1cbiAgICB9IGVsc2UgeyAvLyBub24tYmluYXJ5IGZ1bGwgcGFja2V0XG4gICAgICB0aGlzLmVtaXQoJ2RlY29kZWQnLCBwYWNrZXQpO1xuICAgIH1cbiAgfVxuICBlbHNlIGlmICgoZ2xvYmFsLkJ1ZmZlciAmJiBCdWZmZXIuaXNCdWZmZXIob2JqKSkgfHxcbiAgICAgICAgICAgIChnbG9iYWwuQXJyYXlCdWZmZXIgJiYgb2JqIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHx8XG4gICAgICAgICAgICBvYmouYmFzZTY0KSB7IC8vIHJhdyBiaW5hcnkgZGF0YVxuICAgIGlmICghdGhpcy5yZWNvbnN0cnVjdG9yKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2dvdCBiaW5hcnkgZGF0YSB3aGVuIG5vdCByZWNvbnN0cnVjdGluZyBhIHBhY2tldCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYWNrZXQgPSB0aGlzLnJlY29uc3RydWN0b3IudGFrZUJpbmFyeURhdGEob2JqKTtcbiAgICAgIGlmIChwYWNrZXQpIHsgLy8gcmVjZWl2ZWQgZmluYWwgYnVmZmVyXG4gICAgICAgIHRoaXMucmVjb25zdHJ1Y3RvciA9IG51bGw7XG4gICAgICAgIHRoaXMuZW1pdCgnZGVjb2RlZCcsIHBhY2tldCk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biB0eXBlOiAnICsgb2JqKTtcbiAgfVxufVxuXG4vKipcbiAqIERlY29kZSBhIHBhY2tldCBTdHJpbmcgKEpTT04gZGF0YSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtPYmplY3R9IHBhY2tldFxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gZGVjb2RlU3RyaW5nKHN0cikge1xuICB2YXIgcCA9IHt9O1xuICB2YXIgaSA9IDA7XG5cbiAgLy8gbG9vayB1cCB0eXBlXG4gIHAudHlwZSA9IE51bWJlcihzdHIuY2hhckF0KDApKTtcbiAgaWYgKG51bGwgPT0gZXhwb3J0cy50eXBlc1twLnR5cGVdKSByZXR1cm4gZXJyb3IoKTtcblxuICAvLyBsb29rIHVwIGF0dGFjaG1lbnRzIGlmIHR5cGUgYmluYXJ5XG4gIGlmIChleHBvcnRzLkJJTkFSWV9FVkVOVCA9PSBwLnR5cGUgfHwgZXhwb3J0cy5BQ0sgPT0gcC50eXBlKSB7XG4gICAgcC5hdHRhY2htZW50cyA9ICcnO1xuICAgIHdoaWxlIChzdHIuY2hhckF0KCsraSkgIT0gJy0nKSB7XG4gICAgICBwLmF0dGFjaG1lbnRzICs9IHN0ci5jaGFyQXQoaSk7XG4gICAgfVxuICAgIHAuYXR0YWNobWVudHMgPSBOdW1iZXIocC5hdHRhY2htZW50cyk7XG4gIH1cblxuICAvLyBsb29rIHVwIG5hbWVzcGFjZSAoaWYgYW55KVxuICBpZiAoJy8nID09IHN0ci5jaGFyQXQoaSArIDEpKSB7XG4gICAgcC5uc3AgPSAnJztcbiAgICB3aGlsZSAoKytpKSB7XG4gICAgICB2YXIgYyA9IHN0ci5jaGFyQXQoaSk7XG4gICAgICBpZiAoJywnID09IGMpIGJyZWFrO1xuICAgICAgcC5uc3AgKz0gYztcbiAgICAgIGlmIChpICsgMSA9PSBzdHIubGVuZ3RoKSBicmVhaztcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcC5uc3AgPSAnLyc7XG4gIH1cblxuICAvLyBsb29rIHVwIGlkXG4gIHZhciBuZXh0ID0gc3RyLmNoYXJBdChpICsgMSk7XG4gIGlmICgnJyAhPSBuZXh0ICYmIE51bWJlcihuZXh0KSA9PSBuZXh0KSB7XG4gICAgcC5pZCA9ICcnO1xuICAgIHdoaWxlICgrK2kpIHtcbiAgICAgIHZhciBjID0gc3RyLmNoYXJBdChpKTtcbiAgICAgIGlmIChudWxsID09IGMgfHwgTnVtYmVyKGMpICE9IGMpIHtcbiAgICAgICAgLS1pO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHAuaWQgKz0gc3RyLmNoYXJBdChpKTtcbiAgICAgIGlmIChpICsgMSA9PSBzdHIubGVuZ3RoKSBicmVhaztcbiAgICB9XG4gICAgcC5pZCA9IE51bWJlcihwLmlkKTtcbiAgfVxuXG4gIC8vIGxvb2sgdXAganNvbiBkYXRhXG4gIGlmIChzdHIuY2hhckF0KCsraSkpIHtcbiAgICB0cnkge1xuICAgICAgcC5kYXRhID0ganNvbi5wYXJzZShzdHIuc3Vic3RyKGkpKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgcmV0dXJuIGVycm9yKCk7XG4gICAgfVxuICB9XG5cbiAgZGVidWcoJ2RlY29kZWQgJXMgYXMgJWonLCBzdHIsIHApO1xuICByZXR1cm4gcDtcbn07XG5cbi8qKlxuICogRGVhbGxvY2F0ZXMgYSBwYXJzZXIncyByZXNvdXJjZXNcbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkRlY29kZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMucmVjb25zdHJ1Y3Rvcikge1xuICAgIHRoaXMucmVjb25zdHJ1Y3Rvci5maW5pc2hlZFJlY29uc3RydWN0aW9uKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIG1hbmFnZXIgb2YgYSBiaW5hcnkgZXZlbnQncyAnYnVmZmVyIHNlcXVlbmNlJy4gU2hvdWxkXG4gKiBiZSBjb25zdHJ1Y3RlZCB3aGVuZXZlciBhIHBhY2tldCBvZiB0eXBlIEJJTkFSWV9FVkVOVCBpc1xuICogZGVjb2RlZC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gcGFja2V0XG4gKiBAcmV0dXJuIHtCaW5hcnlSZWNvbnN0cnVjdG9yfSBpbml0aWFsaXplZCByZWNvbnN0cnVjdG9yXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBCaW5hcnlSZWNvbnN0cnVjdG9yKHBhY2tldCkge1xuICB0aGlzLnJlY29uUGFjayA9IHBhY2tldDtcbiAgdGhpcy5idWZmZXJzID0gW107XG59XG5cbi8qKlxuICogTWV0aG9kIHRvIGJlIGNhbGxlZCB3aGVuIGJpbmFyeSBkYXRhIHJlY2VpdmVkIGZyb20gY29ubmVjdGlvblxuICogYWZ0ZXIgYSBCSU5BUllfRVZFTlQgcGFja2V0LlxuICpcbiAqIEBwYXJhbSB7QnVmZmVyIHwgQXJyYXlCdWZmZXJ9IGJpbkRhdGEgLSB0aGUgcmF3IGJpbmFyeSBkYXRhIHJlY2VpdmVkXG4gKiBAcmV0dXJuIHtudWxsIHwgT2JqZWN0fSByZXR1cm5zIG51bGwgaWYgbW9yZSBiaW5hcnkgZGF0YSBpcyBleHBlY3RlZCBvclxuICogICBhIHJlY29uc3RydWN0ZWQgcGFja2V0IG9iamVjdCBpZiBhbGwgYnVmZmVycyBoYXZlIGJlZW4gcmVjZWl2ZWQuXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5CaW5hcnlSZWNvbnN0cnVjdG9yLnByb3RvdHlwZS50YWtlQmluYXJ5RGF0YSA9IGZ1bmN0aW9uKGJpbkRhdGEpIHtcbiAgdGhpcy5idWZmZXJzLnB1c2goYmluRGF0YSk7XG4gIGlmICh0aGlzLmJ1ZmZlcnMubGVuZ3RoID09IHRoaXMucmVjb25QYWNrLmF0dGFjaG1lbnRzKSB7IC8vIGRvbmUgd2l0aCBidWZmZXIgbGlzdFxuICAgIHZhciBwYWNrZXQgPSBiaW5hcnkucmVjb25zdHJ1Y3RQYWNrZXQodGhpcy5yZWNvblBhY2ssIHRoaXMuYnVmZmVycyk7XG4gICAgdGhpcy5maW5pc2hlZFJlY29uc3RydWN0aW9uKCk7XG4gICAgcmV0dXJuIHBhY2tldDtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBDbGVhbnMgdXAgYmluYXJ5IHBhY2tldCByZWNvbnN0cnVjdGlvbiB2YXJpYWJsZXMuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuQmluYXJ5UmVjb25zdHJ1Y3Rvci5wcm90b3R5cGUuZmluaXNoZWRSZWNvbnN0cnVjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnJlY29uUGFjayA9IG51bGw7XG4gIHRoaXMuYnVmZmVycyA9IFtdO1xufVxuXG5mdW5jdGlvbiBlcnJvcihkYXRhKXtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiBleHBvcnRzLkVSUk9SLFxuICAgIGRhdGE6ICdwYXJzZXIgZXJyb3InXG4gIH07XG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIpIiwiLyohIEpTT04gdjMuMi42IHwgaHR0cDovL2Jlc3RpZWpzLmdpdGh1Yi5pby9qc29uMyB8IENvcHlyaWdodCAyMDEyLTIwMTMsIEtpdCBDYW1icmlkZ2UgfCBodHRwOi8va2l0Lm1pdC1saWNlbnNlLm9yZyAqL1xuOyhmdW5jdGlvbiAod2luZG93KSB7XG4gIC8vIENvbnZlbmllbmNlIGFsaWFzZXMuXG4gIHZhciBnZXRDbGFzcyA9IHt9LnRvU3RyaW5nLCBpc1Byb3BlcnR5LCBmb3JFYWNoLCB1bmRlZjtcblxuICAvLyBEZXRlY3QgdGhlIGBkZWZpbmVgIGZ1bmN0aW9uIGV4cG9zZWQgYnkgYXN5bmNocm9ub3VzIG1vZHVsZSBsb2FkZXJzLiBUaGVcbiAgLy8gc3RyaWN0IGBkZWZpbmVgIGNoZWNrIGlzIG5lY2Vzc2FyeSBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIGByLmpzYC5cbiAgdmFyIGlzTG9hZGVyID0gdHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQ7XG5cbiAgLy8gRGV0ZWN0IG5hdGl2ZSBpbXBsZW1lbnRhdGlvbnMuXG4gIHZhciBuYXRpdmVKU09OID0gdHlwZW9mIEpTT04gPT0gXCJvYmplY3RcIiAmJiBKU09OO1xuXG4gIC8vIFNldCB1cCB0aGUgSlNPTiAzIG5hbWVzcGFjZSwgcHJlZmVycmluZyB0aGUgQ29tbW9uSlMgYGV4cG9ydHNgIG9iamVjdCBpZlxuICAvLyBhdmFpbGFibGUuXG4gIHZhciBKU09OMyA9IHR5cGVvZiBleHBvcnRzID09IFwib2JqZWN0XCIgJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSAmJiBleHBvcnRzO1xuXG4gIGlmIChKU09OMyAmJiBuYXRpdmVKU09OKSB7XG4gICAgLy8gRXhwbGljaXRseSBkZWxlZ2F0ZSB0byB0aGUgbmF0aXZlIGBzdHJpbmdpZnlgIGFuZCBgcGFyc2VgXG4gICAgLy8gaW1wbGVtZW50YXRpb25zIGluIENvbW1vbkpTIGVudmlyb25tZW50cy5cbiAgICBKU09OMy5zdHJpbmdpZnkgPSBuYXRpdmVKU09OLnN0cmluZ2lmeTtcbiAgICBKU09OMy5wYXJzZSA9IG5hdGl2ZUpTT04ucGFyc2U7XG4gIH0gZWxzZSB7XG4gICAgLy8gRXhwb3J0IGZvciB3ZWIgYnJvd3NlcnMsIEphdmFTY3JpcHQgZW5naW5lcywgYW5kIGFzeW5jaHJvbm91cyBtb2R1bGVcbiAgICAvLyBsb2FkZXJzLCB1c2luZyB0aGUgZ2xvYmFsIGBKU09OYCBvYmplY3QgaWYgYXZhaWxhYmxlLlxuICAgIEpTT04zID0gd2luZG93LkpTT04gPSBuYXRpdmVKU09OIHx8IHt9O1xuICB9XG5cbiAgLy8gVGVzdCB0aGUgYERhdGUjZ2V0VVRDKmAgbWV0aG9kcy4gQmFzZWQgb24gd29yayBieSBAWWFmZmxlLlxuICB2YXIgaXNFeHRlbmRlZCA9IG5ldyBEYXRlKC0zNTA5ODI3MzM0NTczMjkyKTtcbiAgdHJ5IHtcbiAgICAvLyBUaGUgYGdldFVUQ0Z1bGxZZWFyYCwgYE1vbnRoYCwgYW5kIGBEYXRlYCBtZXRob2RzIHJldHVybiBub25zZW5zaWNhbFxuICAgIC8vIHJlc3VsdHMgZm9yIGNlcnRhaW4gZGF0ZXMgaW4gT3BlcmEgPj0gMTAuNTMuXG4gICAgaXNFeHRlbmRlZCA9IGlzRXh0ZW5kZWQuZ2V0VVRDRnVsbFllYXIoKSA9PSAtMTA5MjUyICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTW9udGgoKSA9PT0gMCAmJiBpc0V4dGVuZGVkLmdldFVUQ0RhdGUoKSA9PT0gMSAmJlxuICAgICAgLy8gU2FmYXJpIDwgMi4wLjIgc3RvcmVzIHRoZSBpbnRlcm5hbCBtaWxsaXNlY29uZCB0aW1lIHZhbHVlIGNvcnJlY3RseSxcbiAgICAgIC8vIGJ1dCBjbGlwcyB0aGUgdmFsdWVzIHJldHVybmVkIGJ5IHRoZSBkYXRlIG1ldGhvZHMgdG8gdGhlIHJhbmdlIG9mXG4gICAgICAvLyBzaWduZWQgMzItYml0IGludGVnZXJzIChbLTIgKiogMzEsIDIgKiogMzEgLSAxXSkuXG4gICAgICBpc0V4dGVuZGVkLmdldFVUQ0hvdXJzKCkgPT0gMTAgJiYgaXNFeHRlbmRlZC5nZXRVVENNaW51dGVzKCkgPT0gMzcgJiYgaXNFeHRlbmRlZC5nZXRVVENTZWNvbmRzKCkgPT0gNiAmJiBpc0V4dGVuZGVkLmdldFVUQ01pbGxpc2Vjb25kcygpID09IDcwODtcbiAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuXG4gIC8vIEludGVybmFsOiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIG5hdGl2ZSBgSlNPTi5zdHJpbmdpZnlgIGFuZCBgcGFyc2VgXG4gIC8vIGltcGxlbWVudGF0aW9ucyBhcmUgc3BlYy1jb21wbGlhbnQuIEJhc2VkIG9uIHdvcmsgYnkgS2VuIFNueWRlci5cbiAgZnVuY3Rpb24gaGFzKG5hbWUpIHtcbiAgICBpZiAoaGFzW25hbWVdICE9PSB1bmRlZikge1xuICAgICAgLy8gUmV0dXJuIGNhY2hlZCBmZWF0dXJlIHRlc3QgcmVzdWx0LlxuICAgICAgcmV0dXJuIGhhc1tuYW1lXTtcbiAgICB9XG5cbiAgICB2YXIgaXNTdXBwb3J0ZWQ7XG4gICAgaWYgKG5hbWUgPT0gXCJidWctc3RyaW5nLWNoYXItaW5kZXhcIikge1xuICAgICAgLy8gSUUgPD0gNyBkb2Vzbid0IHN1cHBvcnQgYWNjZXNzaW5nIHN0cmluZyBjaGFyYWN0ZXJzIHVzaW5nIHNxdWFyZVxuICAgICAgLy8gYnJhY2tldCBub3RhdGlvbi4gSUUgOCBvbmx5IHN1cHBvcnRzIHRoaXMgZm9yIHByaW1pdGl2ZXMuXG4gICAgICBpc1N1cHBvcnRlZCA9IFwiYVwiWzBdICE9IFwiYVwiO1xuICAgIH0gZWxzZSBpZiAobmFtZSA9PSBcImpzb25cIikge1xuICAgICAgLy8gSW5kaWNhdGVzIHdoZXRoZXIgYm90aCBgSlNPTi5zdHJpbmdpZnlgIGFuZCBgSlNPTi5wYXJzZWAgYXJlXG4gICAgICAvLyBzdXBwb3J0ZWQuXG4gICAgICBpc1N1cHBvcnRlZCA9IGhhcyhcImpzb24tc3RyaW5naWZ5XCIpICYmIGhhcyhcImpzb24tcGFyc2VcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB2YWx1ZSwgc2VyaWFsaXplZCA9ICd7XCJhXCI6WzEsdHJ1ZSxmYWxzZSxudWxsLFwiXFxcXHUwMDAwXFxcXGJcXFxcblxcXFxmXFxcXHJcXFxcdFwiXX0nO1xuICAgICAgLy8gVGVzdCBgSlNPTi5zdHJpbmdpZnlgLlxuICAgICAgaWYgKG5hbWUgPT0gXCJqc29uLXN0cmluZ2lmeVwiKSB7XG4gICAgICAgIHZhciBzdHJpbmdpZnkgPSBKU09OMy5zdHJpbmdpZnksIHN0cmluZ2lmeVN1cHBvcnRlZCA9IHR5cGVvZiBzdHJpbmdpZnkgPT0gXCJmdW5jdGlvblwiICYmIGlzRXh0ZW5kZWQ7XG4gICAgICAgIGlmIChzdHJpbmdpZnlTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAvLyBBIHRlc3QgZnVuY3Rpb24gb2JqZWN0IHdpdGggYSBjdXN0b20gYHRvSlNPTmAgbWV0aG9kLlxuICAgICAgICAgICh2YWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgIH0pLnRvSlNPTiA9IHZhbHVlO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzdHJpbmdpZnlTdXBwb3J0ZWQgPVxuICAgICAgICAgICAgICAvLyBGaXJlZm94IDMuMWIxIGFuZCBiMiBzZXJpYWxpemUgc3RyaW5nLCBudW1iZXIsIGFuZCBib29sZWFuXG4gICAgICAgICAgICAgIC8vIHByaW1pdGl2ZXMgYXMgb2JqZWN0IGxpdGVyYWxzLlxuICAgICAgICAgICAgICBzdHJpbmdpZnkoMCkgPT09IFwiMFwiICYmXG4gICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCBiMiwgYW5kIEpTT04gMiBzZXJpYWxpemUgd3JhcHBlZCBwcmltaXRpdmVzIGFzIG9iamVjdFxuICAgICAgICAgICAgICAvLyBsaXRlcmFscy5cbiAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBOdW1iZXIoKSkgPT09IFwiMFwiICYmXG4gICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgU3RyaW5nKCkpID09ICdcIlwiJyAmJlxuICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgMiB0aHJvdyBhbiBlcnJvciBpZiB0aGUgdmFsdWUgaXMgYG51bGxgLCBgdW5kZWZpbmVkYCwgb3JcbiAgICAgICAgICAgICAgLy8gZG9lcyBub3QgZGVmaW5lIGEgY2Fub25pY2FsIEpTT04gcmVwcmVzZW50YXRpb24gKHRoaXMgYXBwbGllcyB0b1xuICAgICAgICAgICAgICAvLyBvYmplY3RzIHdpdGggYHRvSlNPTmAgcHJvcGVydGllcyBhcyB3ZWxsLCAqdW5sZXNzKiB0aGV5IGFyZSBuZXN0ZWRcbiAgICAgICAgICAgICAgLy8gd2l0aGluIGFuIG9iamVjdCBvciBhcnJheSkuXG4gICAgICAgICAgICAgIHN0cmluZ2lmeShnZXRDbGFzcykgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgIC8vIElFIDggc2VyaWFsaXplcyBgdW5kZWZpbmVkYCBhcyBgXCJ1bmRlZmluZWRcImAuIFNhZmFyaSA8PSA1LjEuNyBhbmRcbiAgICAgICAgICAgICAgLy8gRkYgMy4xYjMgcGFzcyB0aGlzIHRlc3QuXG4gICAgICAgICAgICAgIHN0cmluZ2lmeSh1bmRlZikgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgIC8vIFNhZmFyaSA8PSA1LjEuNyBhbmQgRkYgMy4xYjMgdGhyb3cgYEVycm9yYHMgYW5kIGBUeXBlRXJyb3JgcyxcbiAgICAgICAgICAgICAgLy8gcmVzcGVjdGl2ZWx5LCBpZiB0aGUgdmFsdWUgaXMgb21pdHRlZCBlbnRpcmVseS5cbiAgICAgICAgICAgICAgc3RyaW5naWZ5KCkgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCAyIHRocm93IGFuIGVycm9yIGlmIHRoZSBnaXZlbiB2YWx1ZSBpcyBub3QgYSBudW1iZXIsXG4gICAgICAgICAgICAgIC8vIHN0cmluZywgYXJyYXksIG9iamVjdCwgQm9vbGVhbiwgb3IgYG51bGxgIGxpdGVyYWwuIFRoaXMgYXBwbGllcyB0b1xuICAgICAgICAgICAgICAvLyBvYmplY3RzIHdpdGggY3VzdG9tIGB0b0pTT05gIG1ldGhvZHMgYXMgd2VsbCwgdW5sZXNzIHRoZXkgYXJlIG5lc3RlZFxuICAgICAgICAgICAgICAvLyBpbnNpZGUgb2JqZWN0IG9yIGFycmF5IGxpdGVyYWxzLiBZVUkgMy4wLjBiMSBpZ25vcmVzIGN1c3RvbSBgdG9KU09OYFxuICAgICAgICAgICAgICAvLyBtZXRob2RzIGVudGlyZWx5LlxuICAgICAgICAgICAgICBzdHJpbmdpZnkodmFsdWUpID09PSBcIjFcIiAmJlxuICAgICAgICAgICAgICBzdHJpbmdpZnkoW3ZhbHVlXSkgPT0gXCJbMV1cIiAmJlxuICAgICAgICAgICAgICAvLyBQcm90b3R5cGUgPD0gMS42LjEgc2VyaWFsaXplcyBgW3VuZGVmaW5lZF1gIGFzIGBcIltdXCJgIGluc3RlYWQgb2ZcbiAgICAgICAgICAgICAgLy8gYFwiW251bGxdXCJgLlxuICAgICAgICAgICAgICBzdHJpbmdpZnkoW3VuZGVmXSkgPT0gXCJbbnVsbF1cIiAmJlxuICAgICAgICAgICAgICAvLyBZVUkgMy4wLjBiMSBmYWlscyB0byBzZXJpYWxpemUgYG51bGxgIGxpdGVyYWxzLlxuICAgICAgICAgICAgICBzdHJpbmdpZnkobnVsbCkgPT0gXCJudWxsXCIgJiZcbiAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgaGFsdHMgc2VyaWFsaXphdGlvbiBpZiBhbiBhcnJheSBjb250YWlucyBhIGZ1bmN0aW9uOlxuICAgICAgICAgICAgICAvLyBgWzEsIHRydWUsIGdldENsYXNzLCAxXWAgc2VyaWFsaXplcyBhcyBcIlsxLHRydWUsXSxcIi4gRkYgMy4xYjNcbiAgICAgICAgICAgICAgLy8gZWxpZGVzIG5vbi1KU09OIHZhbHVlcyBmcm9tIG9iamVjdHMgYW5kIGFycmF5cywgdW5sZXNzIHRoZXlcbiAgICAgICAgICAgICAgLy8gZGVmaW5lIGN1c3RvbSBgdG9KU09OYCBtZXRob2RzLlxuICAgICAgICAgICAgICBzdHJpbmdpZnkoW3VuZGVmLCBnZXRDbGFzcywgbnVsbF0pID09IFwiW251bGwsbnVsbCxudWxsXVwiICYmXG4gICAgICAgICAgICAgIC8vIFNpbXBsZSBzZXJpYWxpemF0aW9uIHRlc3QuIEZGIDMuMWIxIHVzZXMgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2VzXG4gICAgICAgICAgICAgIC8vIHdoZXJlIGNoYXJhY3RlciBlc2NhcGUgY29kZXMgYXJlIGV4cGVjdGVkIChlLmcuLCBgXFxiYCA9PiBgXFx1MDAwOGApLlxuICAgICAgICAgICAgICBzdHJpbmdpZnkoeyBcImFcIjogW3ZhbHVlLCB0cnVlLCBmYWxzZSwgbnVsbCwgXCJcXHgwMFxcYlxcblxcZlxcclxcdFwiXSB9KSA9PSBzZXJpYWxpemVkICYmXG4gICAgICAgICAgICAgIC8vIEZGIDMuMWIxIGFuZCBiMiBpZ25vcmUgdGhlIGBmaWx0ZXJgIGFuZCBgd2lkdGhgIGFyZ3VtZW50cy5cbiAgICAgICAgICAgICAgc3RyaW5naWZ5KG51bGwsIHZhbHVlKSA9PT0gXCIxXCIgJiZcbiAgICAgICAgICAgICAgc3RyaW5naWZ5KFsxLCAyXSwgbnVsbCwgMSkgPT0gXCJbXFxuIDEsXFxuIDJcXG5dXCIgJiZcbiAgICAgICAgICAgICAgLy8gSlNPTiAyLCBQcm90b3R5cGUgPD0gMS43LCBhbmQgb2xkZXIgV2ViS2l0IGJ1aWxkcyBpbmNvcnJlY3RseVxuICAgICAgICAgICAgICAvLyBzZXJpYWxpemUgZXh0ZW5kZWQgeWVhcnMuXG4gICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSgtOC42NGUxNSkpID09ICdcIi0yNzE4MjEtMDQtMjBUMDA6MDA6MDAuMDAwWlwiJyAmJlxuICAgICAgICAgICAgICAvLyBUaGUgbWlsbGlzZWNvbmRzIGFyZSBvcHRpb25hbCBpbiBFUyA1LCBidXQgcmVxdWlyZWQgaW4gNS4xLlxuICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoOC42NGUxNSkpID09ICdcIisyNzU3NjAtMDktMTNUMDA6MDA6MDAuMDAwWlwiJyAmJlxuICAgICAgICAgICAgICAvLyBGaXJlZm94IDw9IDExLjAgaW5jb3JyZWN0bHkgc2VyaWFsaXplcyB5ZWFycyBwcmlvciB0byAwIGFzIG5lZ2F0aXZlXG4gICAgICAgICAgICAgIC8vIGZvdXItZGlnaXQgeWVhcnMgaW5zdGVhZCBvZiBzaXgtZGlnaXQgeWVhcnMuIENyZWRpdHM6IEBZYWZmbGUuXG4gICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSgtNjIxOTg3NTUyZTUpKSA9PSAnXCItMDAwMDAxLTAxLTAxVDAwOjAwOjAwLjAwMFpcIicgJiZcbiAgICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDUuMS41IGFuZCBPcGVyYSA+PSAxMC41MyBpbmNvcnJlY3RseSBzZXJpYWxpemUgbWlsbGlzZWNvbmRcbiAgICAgICAgICAgICAgLy8gdmFsdWVzIGxlc3MgdGhhbiAxMDAwLiBDcmVkaXRzOiBAWWFmZmxlLlxuICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoLTEpKSA9PSAnXCIxOTY5LTEyLTMxVDIzOjU5OjU5Ljk5OVpcIic7XG4gICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICBzdHJpbmdpZnlTdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaXNTdXBwb3J0ZWQgPSBzdHJpbmdpZnlTdXBwb3J0ZWQ7XG4gICAgICB9XG4gICAgICAvLyBUZXN0IGBKU09OLnBhcnNlYC5cbiAgICAgIGlmIChuYW1lID09IFwianNvbi1wYXJzZVwiKSB7XG4gICAgICAgIHZhciBwYXJzZSA9IEpTT04zLnBhcnNlO1xuICAgICAgICBpZiAodHlwZW9mIHBhcnNlID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBGRiAzLjFiMSwgYjIgd2lsbCB0aHJvdyBhbiBleGNlcHRpb24gaWYgYSBiYXJlIGxpdGVyYWwgaXMgcHJvdmlkZWQuXG4gICAgICAgICAgICAvLyBDb25mb3JtaW5nIGltcGxlbWVudGF0aW9ucyBzaG91bGQgYWxzbyBjb2VyY2UgdGhlIGluaXRpYWwgYXJndW1lbnQgdG9cbiAgICAgICAgICAgIC8vIGEgc3RyaW5nIHByaW9yIHRvIHBhcnNpbmcuXG4gICAgICAgICAgICBpZiAocGFyc2UoXCIwXCIpID09PSAwICYmICFwYXJzZShmYWxzZSkpIHtcbiAgICAgICAgICAgICAgLy8gU2ltcGxlIHBhcnNpbmcgdGVzdC5cbiAgICAgICAgICAgICAgdmFsdWUgPSBwYXJzZShzZXJpYWxpemVkKTtcbiAgICAgICAgICAgICAgdmFyIHBhcnNlU3VwcG9ydGVkID0gdmFsdWVbXCJhXCJdLmxlbmd0aCA9PSA1ICYmIHZhbHVlW1wiYVwiXVswXSA9PT0gMTtcbiAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIC8vIFNhZmFyaSA8PSA1LjEuMiBhbmQgRkYgMy4xYjEgYWxsb3cgdW5lc2NhcGVkIHRhYnMgaW4gc3RyaW5ncy5cbiAgICAgICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gIXBhcnNlKCdcIlxcdFwiJyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgICAgICAgIGlmIChwYXJzZVN1cHBvcnRlZCkge1xuICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRkYgNC4wIGFuZCA0LjAuMSBhbGxvdyBsZWFkaW5nIGArYCBzaWducyBhbmQgbGVhZGluZ1xuICAgICAgICAgICAgICAgICAgICAvLyBkZWNpbWFsIHBvaW50cy4gRkYgNC4wLCA0LjAuMSwgYW5kIElFIDktMTAgYWxzbyBhbGxvd1xuICAgICAgICAgICAgICAgICAgICAvLyBjZXJ0YWluIG9jdGFsIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IHBhcnNlKFwiMDFcIikgIT09IDE7XG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChwYXJzZVN1cHBvcnRlZCkge1xuICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRkYgNC4wLCA0LjAuMSwgYW5kIFJoaW5vIDEuN1IzLVI0IGFsbG93IHRyYWlsaW5nIGRlY2ltYWxcbiAgICAgICAgICAgICAgICAgICAgLy8gcG9pbnRzLiBUaGVzZSBlbnZpcm9ubWVudHMsIGFsb25nIHdpdGggRkYgMy4xYjEgYW5kIDIsXG4gICAgICAgICAgICAgICAgICAgIC8vIGFsc28gYWxsb3cgdHJhaWxpbmcgY29tbWFzIGluIEpTT04gb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgICAgICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IHBhcnNlKFwiMS5cIikgIT09IDE7XG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpc1N1cHBvcnRlZCA9IHBhcnNlU3VwcG9ydGVkO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaGFzW25hbWVdID0gISFpc1N1cHBvcnRlZDtcbiAgfVxuXG4gIGlmICghaGFzKFwianNvblwiKSkge1xuICAgIC8vIENvbW1vbiBgW1tDbGFzc11dYCBuYW1lIGFsaWFzZXMuXG4gICAgdmFyIGZ1bmN0aW9uQ2xhc3MgPSBcIltvYmplY3QgRnVuY3Rpb25dXCI7XG4gICAgdmFyIGRhdGVDbGFzcyA9IFwiW29iamVjdCBEYXRlXVwiO1xuICAgIHZhciBudW1iZXJDbGFzcyA9IFwiW29iamVjdCBOdW1iZXJdXCI7XG4gICAgdmFyIHN0cmluZ0NsYXNzID0gXCJbb2JqZWN0IFN0cmluZ11cIjtcbiAgICB2YXIgYXJyYXlDbGFzcyA9IFwiW29iamVjdCBBcnJheV1cIjtcbiAgICB2YXIgYm9vbGVhbkNsYXNzID0gXCJbb2JqZWN0IEJvb2xlYW5dXCI7XG5cbiAgICAvLyBEZXRlY3QgaW5jb21wbGV0ZSBzdXBwb3J0IGZvciBhY2Nlc3Npbmcgc3RyaW5nIGNoYXJhY3RlcnMgYnkgaW5kZXguXG4gICAgdmFyIGNoYXJJbmRleEJ1Z2d5ID0gaGFzKFwiYnVnLXN0cmluZy1jaGFyLWluZGV4XCIpO1xuXG4gICAgLy8gRGVmaW5lIGFkZGl0aW9uYWwgdXRpbGl0eSBtZXRob2RzIGlmIHRoZSBgRGF0ZWAgbWV0aG9kcyBhcmUgYnVnZ3kuXG4gICAgaWYgKCFpc0V4dGVuZGVkKSB7XG4gICAgICB2YXIgZmxvb3IgPSBNYXRoLmZsb29yO1xuICAgICAgLy8gQSBtYXBwaW5nIGJldHdlZW4gdGhlIG1vbnRocyBvZiB0aGUgeWVhciBhbmQgdGhlIG51bWJlciBvZiBkYXlzIGJldHdlZW5cbiAgICAgIC8vIEphbnVhcnkgMXN0IGFuZCB0aGUgZmlyc3Qgb2YgdGhlIHJlc3BlY3RpdmUgbW9udGguXG4gICAgICB2YXIgTW9udGhzID0gWzAsIDMxLCA1OSwgOTAsIDEyMCwgMTUxLCAxODEsIDIxMiwgMjQzLCAyNzMsIDMwNCwgMzM0XTtcbiAgICAgIC8vIEludGVybmFsOiBDYWxjdWxhdGVzIHRoZSBudW1iZXIgb2YgZGF5cyBiZXR3ZWVuIHRoZSBVbml4IGVwb2NoIGFuZCB0aGVcbiAgICAgIC8vIGZpcnN0IGRheSBvZiB0aGUgZ2l2ZW4gbW9udGguXG4gICAgICB2YXIgZ2V0RGF5ID0gZnVuY3Rpb24gKHllYXIsIG1vbnRoKSB7XG4gICAgICAgIHJldHVybiBNb250aHNbbW9udGhdICsgMzY1ICogKHllYXIgLSAxOTcwKSArIGZsb29yKCh5ZWFyIC0gMTk2OSArIChtb250aCA9ICsobW9udGggPiAxKSkpIC8gNCkgLSBmbG9vcigoeWVhciAtIDE5MDEgKyBtb250aCkgLyAxMDApICsgZmxvb3IoKHllYXIgLSAxNjAxICsgbW9udGgpIC8gNDAwKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gSW50ZXJuYWw6IERldGVybWluZXMgaWYgYSBwcm9wZXJ0eSBpcyBhIGRpcmVjdCBwcm9wZXJ0eSBvZiB0aGUgZ2l2ZW5cbiAgICAvLyBvYmplY3QuIERlbGVnYXRlcyB0byB0aGUgbmF0aXZlIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIG1ldGhvZC5cbiAgICBpZiAoIShpc1Byb3BlcnR5ID0ge30uaGFzT3duUHJvcGVydHkpKSB7XG4gICAgICBpc1Byb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgIHZhciBtZW1iZXJzID0ge30sIGNvbnN0cnVjdG9yO1xuICAgICAgICBpZiAoKG1lbWJlcnMuX19wcm90b19fID0gbnVsbCwgbWVtYmVycy5fX3Byb3RvX18gPSB7XG4gICAgICAgICAgLy8gVGhlICpwcm90byogcHJvcGVydHkgY2Fubm90IGJlIHNldCBtdWx0aXBsZSB0aW1lcyBpbiByZWNlbnRcbiAgICAgICAgICAvLyB2ZXJzaW9ucyBvZiBGaXJlZm94IGFuZCBTZWFNb25rZXkuXG4gICAgICAgICAgXCJ0b1N0cmluZ1wiOiAxXG4gICAgICAgIH0sIG1lbWJlcnMpLnRvU3RyaW5nICE9IGdldENsYXNzKSB7XG4gICAgICAgICAgLy8gU2FmYXJpIDw9IDIuMC4zIGRvZXNuJ3QgaW1wbGVtZW50IGBPYmplY3QjaGFzT3duUHJvcGVydHlgLCBidXRcbiAgICAgICAgICAvLyBzdXBwb3J0cyB0aGUgbXV0YWJsZSAqcHJvdG8qIHByb3BlcnR5LlxuICAgICAgICAgIGlzUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgIC8vIENhcHR1cmUgYW5kIGJyZWFrIHRoZSBvYmplY3QncyBwcm90b3R5cGUgY2hhaW4gKHNlZSBzZWN0aW9uIDguNi4yXG4gICAgICAgICAgICAvLyBvZiB0aGUgRVMgNS4xIHNwZWMpLiBUaGUgcGFyZW50aGVzaXplZCBleHByZXNzaW9uIHByZXZlbnRzIGFuXG4gICAgICAgICAgICAvLyB1bnNhZmUgdHJhbnNmb3JtYXRpb24gYnkgdGhlIENsb3N1cmUgQ29tcGlsZXIuXG4gICAgICAgICAgICB2YXIgb3JpZ2luYWwgPSB0aGlzLl9fcHJvdG9fXywgcmVzdWx0ID0gcHJvcGVydHkgaW4gKHRoaXMuX19wcm90b19fID0gbnVsbCwgdGhpcyk7XG4gICAgICAgICAgICAvLyBSZXN0b3JlIHRoZSBvcmlnaW5hbCBwcm90b3R5cGUgY2hhaW4uXG4gICAgICAgICAgICB0aGlzLl9fcHJvdG9fXyA9IG9yaWdpbmFsO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIENhcHR1cmUgYSByZWZlcmVuY2UgdG8gdGhlIHRvcC1sZXZlbCBgT2JqZWN0YCBjb25zdHJ1Y3Rvci5cbiAgICAgICAgICBjb25zdHJ1Y3RvciA9IG1lbWJlcnMuY29uc3RydWN0b3I7XG4gICAgICAgICAgLy8gVXNlIHRoZSBgY29uc3RydWN0b3JgIHByb3BlcnR5IHRvIHNpbXVsYXRlIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIGluXG4gICAgICAgICAgLy8gb3RoZXIgZW52aXJvbm1lbnRzLlxuICAgICAgICAgIGlzUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgIHZhciBwYXJlbnQgPSAodGhpcy5jb25zdHJ1Y3RvciB8fCBjb25zdHJ1Y3RvcikucHJvdG90eXBlO1xuICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5IGluIHRoaXMgJiYgIShwcm9wZXJ0eSBpbiBwYXJlbnQgJiYgdGhpc1twcm9wZXJ0eV0gPT09IHBhcmVudFtwcm9wZXJ0eV0pO1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgbWVtYmVycyA9IG51bGw7XG4gICAgICAgIHJldHVybiBpc1Byb3BlcnR5LmNhbGwodGhpcywgcHJvcGVydHkpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBJbnRlcm5hbDogQSBzZXQgb2YgcHJpbWl0aXZlIHR5cGVzIHVzZWQgYnkgYGlzSG9zdFR5cGVgLlxuICAgIHZhciBQcmltaXRpdmVUeXBlcyA9IHtcbiAgICAgICdib29sZWFuJzogMSxcbiAgICAgICdudW1iZXInOiAxLFxuICAgICAgJ3N0cmluZyc6IDEsXG4gICAgICAndW5kZWZpbmVkJzogMVxuICAgIH07XG5cbiAgICAvLyBJbnRlcm5hbDogRGV0ZXJtaW5lcyBpZiB0aGUgZ2l2ZW4gb2JqZWN0IGBwcm9wZXJ0eWAgdmFsdWUgaXMgYVxuICAgIC8vIG5vbi1wcmltaXRpdmUuXG4gICAgdmFyIGlzSG9zdFR5cGUgPSBmdW5jdGlvbiAob2JqZWN0LCBwcm9wZXJ0eSkge1xuICAgICAgdmFyIHR5cGUgPSB0eXBlb2Ygb2JqZWN0W3Byb3BlcnR5XTtcbiAgICAgIHJldHVybiB0eXBlID09ICdvYmplY3QnID8gISFvYmplY3RbcHJvcGVydHldIDogIVByaW1pdGl2ZVR5cGVzW3R5cGVdO1xuICAgIH07XG5cbiAgICAvLyBJbnRlcm5hbDogTm9ybWFsaXplcyB0aGUgYGZvci4uLmluYCBpdGVyYXRpb24gYWxnb3JpdGhtIGFjcm9zc1xuICAgIC8vIGVudmlyb25tZW50cy4gRWFjaCBlbnVtZXJhdGVkIGtleSBpcyB5aWVsZGVkIHRvIGEgYGNhbGxiYWNrYCBmdW5jdGlvbi5cbiAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBzaXplID0gMCwgUHJvcGVydGllcywgbWVtYmVycywgcHJvcGVydHk7XG5cbiAgICAgIC8vIFRlc3RzIGZvciBidWdzIGluIHRoZSBjdXJyZW50IGVudmlyb25tZW50J3MgYGZvci4uLmluYCBhbGdvcml0aG0uIFRoZVxuICAgICAgLy8gYHZhbHVlT2ZgIHByb3BlcnR5IGluaGVyaXRzIHRoZSBub24tZW51bWVyYWJsZSBmbGFnIGZyb21cbiAgICAgIC8vIGBPYmplY3QucHJvdG90eXBlYCBpbiBvbGRlciB2ZXJzaW9ucyBvZiBJRSwgTmV0c2NhcGUsIGFuZCBNb3ppbGxhLlxuICAgICAgKFByb3BlcnRpZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMudmFsdWVPZiA9IDA7XG4gICAgICB9KS5wcm90b3R5cGUudmFsdWVPZiA9IDA7XG5cbiAgICAgIC8vIEl0ZXJhdGUgb3ZlciBhIG5ldyBpbnN0YW5jZSBvZiB0aGUgYFByb3BlcnRpZXNgIGNsYXNzLlxuICAgICAgbWVtYmVycyA9IG5ldyBQcm9wZXJ0aWVzKCk7XG4gICAgICBmb3IgKHByb3BlcnR5IGluIG1lbWJlcnMpIHtcbiAgICAgICAgLy8gSWdub3JlIGFsbCBwcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIGBPYmplY3QucHJvdG90eXBlYC5cbiAgICAgICAgaWYgKGlzUHJvcGVydHkuY2FsbChtZW1iZXJzLCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICBzaXplKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFByb3BlcnRpZXMgPSBtZW1iZXJzID0gbnVsbDtcblxuICAgICAgLy8gTm9ybWFsaXplIHRoZSBpdGVyYXRpb24gYWxnb3JpdGhtLlxuICAgICAgaWYgKCFzaXplKSB7XG4gICAgICAgIC8vIEEgbGlzdCBvZiBub24tZW51bWVyYWJsZSBwcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIGBPYmplY3QucHJvdG90eXBlYC5cbiAgICAgICAgbWVtYmVycyA9IFtcInZhbHVlT2ZcIiwgXCJ0b1N0cmluZ1wiLCBcInRvTG9jYWxlU3RyaW5nXCIsIFwicHJvcGVydHlJc0VudW1lcmFibGVcIiwgXCJpc1Byb3RvdHlwZU9mXCIsIFwiaGFzT3duUHJvcGVydHlcIiwgXCJjb25zdHJ1Y3RvclwiXTtcbiAgICAgICAgLy8gSUUgPD0gOCwgTW96aWxsYSAxLjAsIGFuZCBOZXRzY2FwZSA2LjIgaWdub3JlIHNoYWRvd2VkIG5vbi1lbnVtZXJhYmxlXG4gICAgICAgIC8vIHByb3BlcnRpZXMuXG4gICAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IGZ1bmN0aW9uQ2xhc3MsIHByb3BlcnR5LCBsZW5ndGg7XG4gICAgICAgICAgdmFyIGhhc1Byb3BlcnR5ID0gIWlzRnVuY3Rpb24gJiYgdHlwZW9mIG9iamVjdC5jb25zdHJ1Y3RvciAhPSAnZnVuY3Rpb24nICYmIGlzSG9zdFR5cGUob2JqZWN0LCAnaGFzT3duUHJvcGVydHknKSA/IG9iamVjdC5oYXNPd25Qcm9wZXJ0eSA6IGlzUHJvcGVydHk7XG4gICAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgIC8vIEdlY2tvIDw9IDEuMCBlbnVtZXJhdGVzIHRoZSBgcHJvdG90eXBlYCBwcm9wZXJ0eSBvZiBmdW5jdGlvbnMgdW5kZXJcbiAgICAgICAgICAgIC8vIGNlcnRhaW4gY29uZGl0aW9uczsgSUUgZG9lcyBub3QuXG4gICAgICAgICAgICBpZiAoIShpc0Z1bmN0aW9uICYmIHByb3BlcnR5ID09IFwicHJvdG90eXBlXCIpICYmIGhhc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBNYW51YWxseSBpbnZva2UgdGhlIGNhbGxiYWNrIGZvciBlYWNoIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5LlxuICAgICAgICAgIGZvciAobGVuZ3RoID0gbWVtYmVycy5sZW5ndGg7IHByb3BlcnR5ID0gbWVtYmVyc1stLWxlbmd0aF07IGhhc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkgJiYgY2FsbGJhY2socHJvcGVydHkpKTtcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAoc2l6ZSA9PSAyKSB7XG4gICAgICAgIC8vIFNhZmFyaSA8PSAyLjAuNCBlbnVtZXJhdGVzIHNoYWRvd2VkIHByb3BlcnRpZXMgdHdpY2UuXG4gICAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICAgIC8vIENyZWF0ZSBhIHNldCBvZiBpdGVyYXRlZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgIHZhciBtZW1iZXJzID0ge30sIGlzRnVuY3Rpb24gPSBnZXRDbGFzcy5jYWxsKG9iamVjdCkgPT0gZnVuY3Rpb25DbGFzcywgcHJvcGVydHk7XG4gICAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgIC8vIFN0b3JlIGVhY2ggcHJvcGVydHkgbmFtZSB0byBwcmV2ZW50IGRvdWJsZSBlbnVtZXJhdGlvbi4gVGhlXG4gICAgICAgICAgICAvLyBgcHJvdG90eXBlYCBwcm9wZXJ0eSBvZiBmdW5jdGlvbnMgaXMgbm90IGVudW1lcmF0ZWQgZHVlIHRvIGNyb3NzLVxuICAgICAgICAgICAgLy8gZW52aXJvbm1lbnQgaW5jb25zaXN0ZW5jaWVzLlxuICAgICAgICAgICAgaWYgKCEoaXNGdW5jdGlvbiAmJiBwcm9wZXJ0eSA9PSBcInByb3RvdHlwZVwiKSAmJiAhaXNQcm9wZXJ0eS5jYWxsKG1lbWJlcnMsIHByb3BlcnR5KSAmJiAobWVtYmVyc1twcm9wZXJ0eV0gPSAxKSAmJiBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE5vIGJ1Z3MgZGV0ZWN0ZWQ7IHVzZSB0aGUgc3RhbmRhcmQgYGZvci4uLmluYCBhbGdvcml0aG0uXG4gICAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IGZ1bmN0aW9uQ2xhc3MsIHByb3BlcnR5LCBpc0NvbnN0cnVjdG9yO1xuICAgICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICBpZiAoIShpc0Z1bmN0aW9uICYmIHByb3BlcnR5ID09IFwicHJvdG90eXBlXCIpICYmIGlzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSAmJiAhKGlzQ29uc3RydWN0b3IgPSBwcm9wZXJ0eSA9PT0gXCJjb25zdHJ1Y3RvclwiKSkge1xuICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIE1hbnVhbGx5IGludm9rZSB0aGUgY2FsbGJhY2sgZm9yIHRoZSBgY29uc3RydWN0b3JgIHByb3BlcnR5IGR1ZSB0b1xuICAgICAgICAgIC8vIGNyb3NzLWVudmlyb25tZW50IGluY29uc2lzdGVuY2llcy5cbiAgICAgICAgICBpZiAoaXNDb25zdHJ1Y3RvciB8fCBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCAocHJvcGVydHkgPSBcImNvbnN0cnVjdG9yXCIpKSkge1xuICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmb3JFYWNoKG9iamVjdCwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICAvLyBQdWJsaWM6IFNlcmlhbGl6ZXMgYSBKYXZhU2NyaXB0IGB2YWx1ZWAgYXMgYSBKU09OIHN0cmluZy4gVGhlIG9wdGlvbmFsXG4gICAgLy8gYGZpbHRlcmAgYXJndW1lbnQgbWF5IHNwZWNpZnkgZWl0aGVyIGEgZnVuY3Rpb24gdGhhdCBhbHRlcnMgaG93IG9iamVjdCBhbmRcbiAgICAvLyBhcnJheSBtZW1iZXJzIGFyZSBzZXJpYWxpemVkLCBvciBhbiBhcnJheSBvZiBzdHJpbmdzIGFuZCBudW1iZXJzIHRoYXRcbiAgICAvLyBpbmRpY2F0ZXMgd2hpY2ggcHJvcGVydGllcyBzaG91bGQgYmUgc2VyaWFsaXplZC4gVGhlIG9wdGlvbmFsIGB3aWR0aGBcbiAgICAvLyBhcmd1bWVudCBtYXkgYmUgZWl0aGVyIGEgc3RyaW5nIG9yIG51bWJlciB0aGF0IHNwZWNpZmllcyB0aGUgaW5kZW50YXRpb25cbiAgICAvLyBsZXZlbCBvZiB0aGUgb3V0cHV0LlxuICAgIGlmICghaGFzKFwianNvbi1zdHJpbmdpZnlcIikpIHtcbiAgICAgIC8vIEludGVybmFsOiBBIG1hcCBvZiBjb250cm9sIGNoYXJhY3RlcnMgYW5kIHRoZWlyIGVzY2FwZWQgZXF1aXZhbGVudHMuXG4gICAgICB2YXIgRXNjYXBlcyA9IHtcbiAgICAgICAgOTI6IFwiXFxcXFxcXFxcIixcbiAgICAgICAgMzQ6ICdcXFxcXCInLFxuICAgICAgICA4OiBcIlxcXFxiXCIsXG4gICAgICAgIDEyOiBcIlxcXFxmXCIsXG4gICAgICAgIDEwOiBcIlxcXFxuXCIsXG4gICAgICAgIDEzOiBcIlxcXFxyXCIsXG4gICAgICAgIDk6IFwiXFxcXHRcIlxuICAgICAgfTtcblxuICAgICAgLy8gSW50ZXJuYWw6IENvbnZlcnRzIGB2YWx1ZWAgaW50byBhIHplcm8tcGFkZGVkIHN0cmluZyBzdWNoIHRoYXQgaXRzXG4gICAgICAvLyBsZW5ndGggaXMgYXQgbGVhc3QgZXF1YWwgdG8gYHdpZHRoYC4gVGhlIGB3aWR0aGAgbXVzdCBiZSA8PSA2LlxuICAgICAgdmFyIGxlYWRpbmdaZXJvZXMgPSBcIjAwMDAwMFwiO1xuICAgICAgdmFyIHRvUGFkZGVkU3RyaW5nID0gZnVuY3Rpb24gKHdpZHRoLCB2YWx1ZSkge1xuICAgICAgICAvLyBUaGUgYHx8IDBgIGV4cHJlc3Npb24gaXMgbmVjZXNzYXJ5IHRvIHdvcmsgYXJvdW5kIGEgYnVnIGluXG4gICAgICAgIC8vIE9wZXJhIDw9IDcuNTR1MiB3aGVyZSBgMCA9PSAtMGAsIGJ1dCBgU3RyaW5nKC0wKSAhPT0gXCIwXCJgLlxuICAgICAgICByZXR1cm4gKGxlYWRpbmdaZXJvZXMgKyAodmFsdWUgfHwgMCkpLnNsaWNlKC13aWR0aCk7XG4gICAgICB9O1xuXG4gICAgICAvLyBJbnRlcm5hbDogRG91YmxlLXF1b3RlcyBhIHN0cmluZyBgdmFsdWVgLCByZXBsYWNpbmcgYWxsIEFTQ0lJIGNvbnRyb2xcbiAgICAgIC8vIGNoYXJhY3RlcnMgKGNoYXJhY3RlcnMgd2l0aCBjb2RlIHVuaXQgdmFsdWVzIGJldHdlZW4gMCBhbmQgMzEpIHdpdGhcbiAgICAgIC8vIHRoZWlyIGVzY2FwZWQgZXF1aXZhbGVudHMuIFRoaXMgaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgdGhlXG4gICAgICAvLyBgUXVvdGUodmFsdWUpYCBvcGVyYXRpb24gZGVmaW5lZCBpbiBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zLlxuICAgICAgdmFyIHVuaWNvZGVQcmVmaXggPSBcIlxcXFx1MDBcIjtcbiAgICAgIHZhciBxdW90ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gJ1wiJywgaW5kZXggPSAwLCBsZW5ndGggPSB2YWx1ZS5sZW5ndGgsIGlzTGFyZ2UgPSBsZW5ndGggPiAxMCAmJiBjaGFySW5kZXhCdWdneSwgc3ltYm9scztcbiAgICAgICAgaWYgKGlzTGFyZ2UpIHtcbiAgICAgICAgICBzeW1ib2xzID0gdmFsdWUuc3BsaXQoXCJcIik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgdmFyIGNoYXJDb2RlID0gdmFsdWUuY2hhckNvZGVBdChpbmRleCk7XG4gICAgICAgICAgLy8gSWYgdGhlIGNoYXJhY3RlciBpcyBhIGNvbnRyb2wgY2hhcmFjdGVyLCBhcHBlbmQgaXRzIFVuaWNvZGUgb3JcbiAgICAgICAgICAvLyBzaG9ydGhhbmQgZXNjYXBlIHNlcXVlbmNlOyBvdGhlcndpc2UsIGFwcGVuZCB0aGUgY2hhcmFjdGVyIGFzLWlzLlxuICAgICAgICAgIHN3aXRjaCAoY2hhckNvZGUpIHtcbiAgICAgICAgICAgIGNhc2UgODogY2FzZSA5OiBjYXNlIDEwOiBjYXNlIDEyOiBjYXNlIDEzOiBjYXNlIDM0OiBjYXNlIDkyOlxuICAgICAgICAgICAgICByZXN1bHQgKz0gRXNjYXBlc1tjaGFyQ29kZV07XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlIDwgMzIpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gdW5pY29kZVByZWZpeCArIHRvUGFkZGVkU3RyaW5nKDIsIGNoYXJDb2RlLnRvU3RyaW5nKDE2KSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzdWx0ICs9IGlzTGFyZ2UgPyBzeW1ib2xzW2luZGV4XSA6IGNoYXJJbmRleEJ1Z2d5ID8gdmFsdWUuY2hhckF0KGluZGV4KSA6IHZhbHVlW2luZGV4XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdCArICdcIic7XG4gICAgICB9O1xuXG4gICAgICAvLyBJbnRlcm5hbDogUmVjdXJzaXZlbHkgc2VyaWFsaXplcyBhbiBvYmplY3QuIEltcGxlbWVudHMgdGhlXG4gICAgICAvLyBgU3RyKGtleSwgaG9sZGVyKWAsIGBKTyh2YWx1ZSlgLCBhbmQgYEpBKHZhbHVlKWAgb3BlcmF0aW9ucy5cbiAgICAgIHZhciBzZXJpYWxpemUgPSBmdW5jdGlvbiAocHJvcGVydHksIG9iamVjdCwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIHdoaXRlc3BhY2UsIGluZGVudGF0aW9uLCBzdGFjaykge1xuICAgICAgICB2YXIgdmFsdWUsIGNsYXNzTmFtZSwgeWVhciwgbW9udGgsIGRhdGUsIHRpbWUsIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBtaWxsaXNlY29uZHMsIHJlc3VsdHMsIGVsZW1lbnQsIGluZGV4LCBsZW5ndGgsIHByZWZpeCwgcmVzdWx0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIE5lY2Vzc2FyeSBmb3IgaG9zdCBvYmplY3Qgc3VwcG9ydC5cbiAgICAgICAgICB2YWx1ZSA9IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcIm9iamVjdFwiICYmIHZhbHVlKSB7XG4gICAgICAgICAgY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh2YWx1ZSk7XG4gICAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBkYXRlQ2xhc3MgJiYgIWlzUHJvcGVydHkuY2FsbCh2YWx1ZSwgXCJ0b0pTT05cIikpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSA+IC0xIC8gMCAmJiB2YWx1ZSA8IDEgLyAwKSB7XG4gICAgICAgICAgICAgIC8vIERhdGVzIGFyZSBzZXJpYWxpemVkIGFjY29yZGluZyB0byB0aGUgYERhdGUjdG9KU09OYCBtZXRob2RcbiAgICAgICAgICAgICAgLy8gc3BlY2lmaWVkIGluIEVTIDUuMSBzZWN0aW9uIDE1LjkuNS40NC4gU2VlIHNlY3Rpb24gMTUuOS4xLjE1XG4gICAgICAgICAgICAgIC8vIGZvciB0aGUgSVNPIDg2MDEgZGF0ZSB0aW1lIHN0cmluZyBmb3JtYXQuXG4gICAgICAgICAgICAgIGlmIChnZXREYXkpIHtcbiAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBjb21wdXRlIHRoZSB5ZWFyLCBtb250aCwgZGF0ZSwgaG91cnMsIG1pbnV0ZXMsXG4gICAgICAgICAgICAgICAgLy8gc2Vjb25kcywgYW5kIG1pbGxpc2Vjb25kcyBpZiB0aGUgYGdldFVUQypgIG1ldGhvZHMgYXJlXG4gICAgICAgICAgICAgICAgLy8gYnVnZ3kuIEFkYXB0ZWQgZnJvbSBAWWFmZmxlJ3MgYGRhdGUtc2hpbWAgcHJvamVjdC5cbiAgICAgICAgICAgICAgICBkYXRlID0gZmxvb3IodmFsdWUgLyA4NjRlNSk7XG4gICAgICAgICAgICAgICAgZm9yICh5ZWFyID0gZmxvb3IoZGF0ZSAvIDM2NS4yNDI1KSArIDE5NzAgLSAxOyBnZXREYXkoeWVhciArIDEsIDApIDw9IGRhdGU7IHllYXIrKyk7XG4gICAgICAgICAgICAgICAgZm9yIChtb250aCA9IGZsb29yKChkYXRlIC0gZ2V0RGF5KHllYXIsIDApKSAvIDMwLjQyKTsgZ2V0RGF5KHllYXIsIG1vbnRoICsgMSkgPD0gZGF0ZTsgbW9udGgrKyk7XG4gICAgICAgICAgICAgICAgZGF0ZSA9IDEgKyBkYXRlIC0gZ2V0RGF5KHllYXIsIG1vbnRoKTtcbiAgICAgICAgICAgICAgICAvLyBUaGUgYHRpbWVgIHZhbHVlIHNwZWNpZmllcyB0aGUgdGltZSB3aXRoaW4gdGhlIGRheSAoc2VlIEVTXG4gICAgICAgICAgICAgICAgLy8gNS4xIHNlY3Rpb24gMTUuOS4xLjIpLiBUaGUgZm9ybXVsYSBgKEEgJSBCICsgQikgJSBCYCBpcyB1c2VkXG4gICAgICAgICAgICAgICAgLy8gdG8gY29tcHV0ZSBgQSBtb2R1bG8gQmAsIGFzIHRoZSBgJWAgb3BlcmF0b3IgZG9lcyBub3RcbiAgICAgICAgICAgICAgICAvLyBjb3JyZXNwb25kIHRvIHRoZSBgbW9kdWxvYCBvcGVyYXRpb24gZm9yIG5lZ2F0aXZlIG51bWJlcnMuXG4gICAgICAgICAgICAgICAgdGltZSA9ICh2YWx1ZSAlIDg2NGU1ICsgODY0ZTUpICUgODY0ZTU7XG4gICAgICAgICAgICAgICAgLy8gVGhlIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBhbmQgbWlsbGlzZWNvbmRzIGFyZSBvYnRhaW5lZCBieVxuICAgICAgICAgICAgICAgIC8vIGRlY29tcG9zaW5nIHRoZSB0aW1lIHdpdGhpbiB0aGUgZGF5LiBTZWUgc2VjdGlvbiAxNS45LjEuMTAuXG4gICAgICAgICAgICAgICAgaG91cnMgPSBmbG9vcih0aW1lIC8gMzZlNSkgJSAyNDtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gZmxvb3IodGltZSAvIDZlNCkgJSA2MDtcbiAgICAgICAgICAgICAgICBzZWNvbmRzID0gZmxvb3IodGltZSAvIDFlMykgJSA2MDtcbiAgICAgICAgICAgICAgICBtaWxsaXNlY29uZHMgPSB0aW1lICUgMWUzO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHllYXIgPSB2YWx1ZS5nZXRVVENGdWxsWWVhcigpO1xuICAgICAgICAgICAgICAgIG1vbnRoID0gdmFsdWUuZ2V0VVRDTW9udGgoKTtcbiAgICAgICAgICAgICAgICBkYXRlID0gdmFsdWUuZ2V0VVRDRGF0ZSgpO1xuICAgICAgICAgICAgICAgIGhvdXJzID0gdmFsdWUuZ2V0VVRDSG91cnMoKTtcbiAgICAgICAgICAgICAgICBtaW51dGVzID0gdmFsdWUuZ2V0VVRDTWludXRlcygpO1xuICAgICAgICAgICAgICAgIHNlY29uZHMgPSB2YWx1ZS5nZXRVVENTZWNvbmRzKCk7XG4gICAgICAgICAgICAgICAgbWlsbGlzZWNvbmRzID0gdmFsdWUuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gU2VyaWFsaXplIGV4dGVuZGVkIHllYXJzIGNvcnJlY3RseS5cbiAgICAgICAgICAgICAgdmFsdWUgPSAoeWVhciA8PSAwIHx8IHllYXIgPj0gMWU0ID8gKHllYXIgPCAwID8gXCItXCIgOiBcIitcIikgKyB0b1BhZGRlZFN0cmluZyg2LCB5ZWFyIDwgMCA/IC15ZWFyIDogeWVhcikgOiB0b1BhZGRlZFN0cmluZyg0LCB5ZWFyKSkgK1xuICAgICAgICAgICAgICAgIFwiLVwiICsgdG9QYWRkZWRTdHJpbmcoMiwgbW9udGggKyAxKSArIFwiLVwiICsgdG9QYWRkZWRTdHJpbmcoMiwgZGF0ZSkgK1xuICAgICAgICAgICAgICAgIC8vIE1vbnRocywgZGF0ZXMsIGhvdXJzLCBtaW51dGVzLCBhbmQgc2Vjb25kcyBzaG91bGQgaGF2ZSB0d29cbiAgICAgICAgICAgICAgICAvLyBkaWdpdHM7IG1pbGxpc2Vjb25kcyBzaG91bGQgaGF2ZSB0aHJlZS5cbiAgICAgICAgICAgICAgICBcIlRcIiArIHRvUGFkZGVkU3RyaW5nKDIsIGhvdXJzKSArIFwiOlwiICsgdG9QYWRkZWRTdHJpbmcoMiwgbWludXRlcykgKyBcIjpcIiArIHRvUGFkZGVkU3RyaW5nKDIsIHNlY29uZHMpICtcbiAgICAgICAgICAgICAgICAvLyBNaWxsaXNlY29uZHMgYXJlIG9wdGlvbmFsIGluIEVTIDUuMCwgYnV0IHJlcXVpcmVkIGluIDUuMS5cbiAgICAgICAgICAgICAgICBcIi5cIiArIHRvUGFkZGVkU3RyaW5nKDMsIG1pbGxpc2Vjb25kcykgKyBcIlpcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZS50b0pTT04gPT0gXCJmdW5jdGlvblwiICYmICgoY2xhc3NOYW1lICE9IG51bWJlckNsYXNzICYmIGNsYXNzTmFtZSAhPSBzdHJpbmdDbGFzcyAmJiBjbGFzc05hbWUgIT0gYXJyYXlDbGFzcykgfHwgaXNQcm9wZXJ0eS5jYWxsKHZhbHVlLCBcInRvSlNPTlwiKSkpIHtcbiAgICAgICAgICAgIC8vIFByb3RvdHlwZSA8PSAxLjYuMSBhZGRzIG5vbi1zdGFuZGFyZCBgdG9KU09OYCBtZXRob2RzIHRvIHRoZVxuICAgICAgICAgICAgLy8gYE51bWJlcmAsIGBTdHJpbmdgLCBgRGF0ZWAsIGFuZCBgQXJyYXlgIHByb3RvdHlwZXMuIEpTT04gM1xuICAgICAgICAgICAgLy8gaWdub3JlcyBhbGwgYHRvSlNPTmAgbWV0aG9kcyBvbiB0aGVzZSBvYmplY3RzIHVubGVzcyB0aGV5IGFyZVxuICAgICAgICAgICAgLy8gZGVmaW5lZCBkaXJlY3RseSBvbiBhbiBpbnN0YW5jZS5cbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUudG9KU09OKHByb3BlcnR5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgLy8gSWYgYSByZXBsYWNlbWVudCBmdW5jdGlvbiB3YXMgcHJvdmlkZWQsIGNhbGwgaXQgdG8gb2J0YWluIHRoZSB2YWx1ZVxuICAgICAgICAgIC8vIGZvciBzZXJpYWxpemF0aW9uLlxuICAgICAgICAgIHZhbHVlID0gY2FsbGJhY2suY2FsbChvYmplY3QsIHByb3BlcnR5LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIFwibnVsbFwiO1xuICAgICAgICB9XG4gICAgICAgIGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwodmFsdWUpO1xuICAgICAgICBpZiAoY2xhc3NOYW1lID09IGJvb2xlYW5DbGFzcykge1xuICAgICAgICAgIC8vIEJvb2xlYW5zIGFyZSByZXByZXNlbnRlZCBsaXRlcmFsbHkuXG4gICAgICAgICAgcmV0dXJuIFwiXCIgKyB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gbnVtYmVyQ2xhc3MpIHtcbiAgICAgICAgICAvLyBKU09OIG51bWJlcnMgbXVzdCBiZSBmaW5pdGUuIGBJbmZpbml0eWAgYW5kIGBOYU5gIGFyZSBzZXJpYWxpemVkIGFzXG4gICAgICAgICAgLy8gYFwibnVsbFwiYC5cbiAgICAgICAgICByZXR1cm4gdmFsdWUgPiAtMSAvIDAgJiYgdmFsdWUgPCAxIC8gMCA/IFwiXCIgKyB2YWx1ZSA6IFwibnVsbFwiO1xuICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBzdHJpbmdDbGFzcykge1xuICAgICAgICAgIC8vIFN0cmluZ3MgYXJlIGRvdWJsZS1xdW90ZWQgYW5kIGVzY2FwZWQuXG4gICAgICAgICAgcmV0dXJuIHF1b3RlKFwiXCIgKyB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVjdXJzaXZlbHkgc2VyaWFsaXplIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgLy8gQ2hlY2sgZm9yIGN5Y2xpYyBzdHJ1Y3R1cmVzLiBUaGlzIGlzIGEgbGluZWFyIHNlYXJjaDsgcGVyZm9ybWFuY2VcbiAgICAgICAgICAvLyBpcyBpbnZlcnNlbHkgcHJvcG9ydGlvbmFsIHRvIHRoZSBudW1iZXIgb2YgdW5pcXVlIG5lc3RlZCBvYmplY3RzLlxuICAgICAgICAgIGZvciAobGVuZ3RoID0gc3RhY2subGVuZ3RoOyBsZW5ndGgtLTspIHtcbiAgICAgICAgICAgIGlmIChzdGFja1tsZW5ndGhdID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAvLyBDeWNsaWMgc3RydWN0dXJlcyBjYW5ub3QgYmUgc2VyaWFsaXplZCBieSBgSlNPTi5zdHJpbmdpZnlgLlxuICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gQWRkIHRoZSBvYmplY3QgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgICAgICAgIHN0YWNrLnB1c2godmFsdWUpO1xuICAgICAgICAgIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgICAvLyBTYXZlIHRoZSBjdXJyZW50IGluZGVudGF0aW9uIGxldmVsIGFuZCBpbmRlbnQgb25lIGFkZGl0aW9uYWwgbGV2ZWwuXG4gICAgICAgICAgcHJlZml4ID0gaW5kZW50YXRpb247XG4gICAgICAgICAgaW5kZW50YXRpb24gKz0gd2hpdGVzcGFjZTtcbiAgICAgICAgICBpZiAoY2xhc3NOYW1lID09IGFycmF5Q2xhc3MpIHtcbiAgICAgICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZSBhcnJheSBlbGVtZW50cy5cbiAgICAgICAgICAgIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICAgIGVsZW1lbnQgPSBzZXJpYWxpemUoaW5kZXgsIHZhbHVlLCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgaW5kZW50YXRpb24sIHN0YWNrKTtcbiAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGVsZW1lbnQgPT09IHVuZGVmID8gXCJudWxsXCIgOiBlbGVtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdHMubGVuZ3RoID8gKHdoaXRlc3BhY2UgPyBcIltcXG5cIiArIGluZGVudGF0aW9uICsgcmVzdWx0cy5qb2luKFwiLFxcblwiICsgaW5kZW50YXRpb24pICsgXCJcXG5cIiArIHByZWZpeCArIFwiXVwiIDogKFwiW1wiICsgcmVzdWx0cy5qb2luKFwiLFwiKSArIFwiXVwiKSkgOiBcIltdXCI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZSBvYmplY3QgbWVtYmVycy4gTWVtYmVycyBhcmUgc2VsZWN0ZWQgZnJvbVxuICAgICAgICAgICAgLy8gZWl0aGVyIGEgdXNlci1zcGVjaWZpZWQgbGlzdCBvZiBwcm9wZXJ0eSBuYW1lcywgb3IgdGhlIG9iamVjdFxuICAgICAgICAgICAgLy8gaXRzZWxmLlxuICAgICAgICAgICAgZm9yRWFjaChwcm9wZXJ0aWVzIHx8IHZhbHVlLCBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBzZXJpYWxpemUocHJvcGVydHksIHZhbHVlLCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgaW5kZW50YXRpb24sIHN0YWNrKTtcbiAgICAgICAgICAgICAgaWYgKGVsZW1lbnQgIT09IHVuZGVmKSB7XG4gICAgICAgICAgICAgICAgLy8gQWNjb3JkaW5nIHRvIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjM6IFwiSWYgYGdhcGAge3doaXRlc3BhY2V9XG4gICAgICAgICAgICAgICAgLy8gaXMgbm90IHRoZSBlbXB0eSBzdHJpbmcsIGxldCBgbWVtYmVyYCB7cXVvdGUocHJvcGVydHkpICsgXCI6XCJ9XG4gICAgICAgICAgICAgICAgLy8gYmUgdGhlIGNvbmNhdGVuYXRpb24gb2YgYG1lbWJlcmAgYW5kIHRoZSBgc3BhY2VgIGNoYXJhY3Rlci5cIlxuICAgICAgICAgICAgICAgIC8vIFRoZSBcImBzcGFjZWAgY2hhcmFjdGVyXCIgcmVmZXJzIHRvIHRoZSBsaXRlcmFsIHNwYWNlXG4gICAgICAgICAgICAgICAgLy8gY2hhcmFjdGVyLCBub3QgdGhlIGBzcGFjZWAge3dpZHRofSBhcmd1bWVudCBwcm92aWRlZCB0b1xuICAgICAgICAgICAgICAgIC8vIGBKU09OLnN0cmluZ2lmeWAuXG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHF1b3RlKHByb3BlcnR5KSArIFwiOlwiICsgKHdoaXRlc3BhY2UgPyBcIiBcIiA6IFwiXCIpICsgZWxlbWVudCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0cy5sZW5ndGggPyAod2hpdGVzcGFjZSA/IFwie1xcblwiICsgaW5kZW50YXRpb24gKyByZXN1bHRzLmpvaW4oXCIsXFxuXCIgKyBpbmRlbnRhdGlvbikgKyBcIlxcblwiICsgcHJlZml4ICsgXCJ9XCIgOiAoXCJ7XCIgKyByZXN1bHRzLmpvaW4oXCIsXCIpICsgXCJ9XCIpKSA6IFwie31cIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmVtb3ZlIHRoZSBvYmplY3QgZnJvbSB0aGUgdHJhdmVyc2VkIG9iamVjdCBzdGFjay5cbiAgICAgICAgICBzdGFjay5wb3AoKTtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAvLyBQdWJsaWM6IGBKU09OLnN0cmluZ2lmeWAuIFNlZSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zLlxuICAgICAgSlNPTjMuc3RyaW5naWZ5ID0gZnVuY3Rpb24gKHNvdXJjZSwgZmlsdGVyLCB3aWR0aCkge1xuICAgICAgICB2YXIgd2hpdGVzcGFjZSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIGNsYXNzTmFtZTtcbiAgICAgICAgaWYgKHR5cGVvZiBmaWx0ZXIgPT0gXCJmdW5jdGlvblwiIHx8IHR5cGVvZiBmaWx0ZXIgPT0gXCJvYmplY3RcIiAmJiBmaWx0ZXIpIHtcbiAgICAgICAgICBpZiAoKGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwoZmlsdGVyKSkgPT0gZnVuY3Rpb25DbGFzcykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBmaWx0ZXI7XG4gICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gYXJyYXlDbGFzcykge1xuICAgICAgICAgICAgLy8gQ29udmVydCB0aGUgcHJvcGVydHkgbmFtZXMgYXJyYXkgaW50byBhIG1ha2VzaGlmdCBzZXQuXG4gICAgICAgICAgICBwcm9wZXJ0aWVzID0ge307XG4gICAgICAgICAgICBmb3IgKHZhciBpbmRleCA9IDAsIGxlbmd0aCA9IGZpbHRlci5sZW5ndGgsIHZhbHVlOyBpbmRleCA8IGxlbmd0aDsgdmFsdWUgPSBmaWx0ZXJbaW5kZXgrK10sICgoY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh2YWx1ZSkpLCBjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MgfHwgY2xhc3NOYW1lID09IG51bWJlckNsYXNzKSAmJiAocHJvcGVydGllc1t2YWx1ZV0gPSAxKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh3aWR0aCkge1xuICAgICAgICAgIGlmICgoY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh3aWR0aCkpID09IG51bWJlckNsYXNzKSB7XG4gICAgICAgICAgICAvLyBDb252ZXJ0IHRoZSBgd2lkdGhgIHRvIGFuIGludGVnZXIgYW5kIGNyZWF0ZSBhIHN0cmluZyBjb250YWluaW5nXG4gICAgICAgICAgICAvLyBgd2lkdGhgIG51bWJlciBvZiBzcGFjZSBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgaWYgKCh3aWR0aCAtPSB3aWR0aCAlIDEpID4gMCkge1xuICAgICAgICAgICAgICBmb3IgKHdoaXRlc3BhY2UgPSBcIlwiLCB3aWR0aCA+IDEwICYmICh3aWR0aCA9IDEwKTsgd2hpdGVzcGFjZS5sZW5ndGggPCB3aWR0aDsgd2hpdGVzcGFjZSArPSBcIiBcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MpIHtcbiAgICAgICAgICAgIHdoaXRlc3BhY2UgPSB3aWR0aC5sZW5ndGggPD0gMTAgPyB3aWR0aCA6IHdpZHRoLnNsaWNlKDAsIDEwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gT3BlcmEgPD0gNy41NHUyIGRpc2NhcmRzIHRoZSB2YWx1ZXMgYXNzb2NpYXRlZCB3aXRoIGVtcHR5IHN0cmluZyBrZXlzXG4gICAgICAgIC8vIChgXCJcImApIG9ubHkgaWYgdGhleSBhcmUgdXNlZCBkaXJlY3RseSB3aXRoaW4gYW4gb2JqZWN0IG1lbWJlciBsaXN0XG4gICAgICAgIC8vIChlLmcuLCBgIShcIlwiIGluIHsgXCJcIjogMX0pYCkuXG4gICAgICAgIHJldHVybiBzZXJpYWxpemUoXCJcIiwgKHZhbHVlID0ge30sIHZhbHVlW1wiXCJdID0gc291cmNlLCB2YWx1ZSksIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBcIlwiLCBbXSk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFB1YmxpYzogUGFyc2VzIGEgSlNPTiBzb3VyY2Ugc3RyaW5nLlxuICAgIGlmICghaGFzKFwianNvbi1wYXJzZVwiKSkge1xuICAgICAgdmFyIGZyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGU7XG5cbiAgICAgIC8vIEludGVybmFsOiBBIG1hcCBvZiBlc2NhcGVkIGNvbnRyb2wgY2hhcmFjdGVycyBhbmQgdGhlaXIgdW5lc2NhcGVkXG4gICAgICAvLyBlcXVpdmFsZW50cy5cbiAgICAgIHZhciBVbmVzY2FwZXMgPSB7XG4gICAgICAgIDkyOiBcIlxcXFxcIixcbiAgICAgICAgMzQ6ICdcIicsXG4gICAgICAgIDQ3OiBcIi9cIixcbiAgICAgICAgOTg6IFwiXFxiXCIsXG4gICAgICAgIDExNjogXCJcXHRcIixcbiAgICAgICAgMTEwOiBcIlxcblwiLFxuICAgICAgICAxMDI6IFwiXFxmXCIsXG4gICAgICAgIDExNDogXCJcXHJcIlxuICAgICAgfTtcblxuICAgICAgLy8gSW50ZXJuYWw6IFN0b3JlcyB0aGUgcGFyc2VyIHN0YXRlLlxuICAgICAgdmFyIEluZGV4LCBTb3VyY2U7XG5cbiAgICAgIC8vIEludGVybmFsOiBSZXNldHMgdGhlIHBhcnNlciBzdGF0ZSBhbmQgdGhyb3dzIGEgYFN5bnRheEVycm9yYC5cbiAgICAgIHZhciBhYm9ydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBJbmRleCA9IFNvdXJjZSA9IG51bGw7XG4gICAgICAgIHRocm93IFN5bnRheEVycm9yKCk7XG4gICAgICB9O1xuXG4gICAgICAvLyBJbnRlcm5hbDogUmV0dXJucyB0aGUgbmV4dCB0b2tlbiwgb3IgYFwiJFwiYCBpZiB0aGUgcGFyc2VyIGhhcyByZWFjaGVkXG4gICAgICAvLyB0aGUgZW5kIG9mIHRoZSBzb3VyY2Ugc3RyaW5nLiBBIHRva2VuIG1heSBiZSBhIHN0cmluZywgbnVtYmVyLCBgbnVsbGBcbiAgICAgIC8vIGxpdGVyYWwsIG9yIEJvb2xlYW4gbGl0ZXJhbC5cbiAgICAgIHZhciBsZXggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBTb3VyY2UsIGxlbmd0aCA9IHNvdXJjZS5sZW5ndGgsIHZhbHVlLCBiZWdpbiwgcG9zaXRpb24sIGlzU2lnbmVkLCBjaGFyQ29kZTtcbiAgICAgICAgd2hpbGUgKEluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgc3dpdGNoIChjaGFyQ29kZSkge1xuICAgICAgICAgICAgY2FzZSA5OiBjYXNlIDEwOiBjYXNlIDEzOiBjYXNlIDMyOlxuICAgICAgICAgICAgICAvLyBTa2lwIHdoaXRlc3BhY2UgdG9rZW5zLCBpbmNsdWRpbmcgdGFicywgY2FycmlhZ2UgcmV0dXJucywgbGluZVxuICAgICAgICAgICAgICAvLyBmZWVkcywgYW5kIHNwYWNlIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxMjM6IGNhc2UgMTI1OiBjYXNlIDkxOiBjYXNlIDkzOiBjYXNlIDU4OiBjYXNlIDQ0OlxuICAgICAgICAgICAgICAvLyBQYXJzZSBhIHB1bmN0dWF0b3IgdG9rZW4gKGB7YCwgYH1gLCBgW2AsIGBdYCwgYDpgLCBvciBgLGApIGF0XG4gICAgICAgICAgICAgIC8vIHRoZSBjdXJyZW50IHBvc2l0aW9uLlxuICAgICAgICAgICAgICB2YWx1ZSA9IGNoYXJJbmRleEJ1Z2d5ID8gc291cmNlLmNoYXJBdChJbmRleCkgOiBzb3VyY2VbSW5kZXhdO1xuICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICBjYXNlIDM0OlxuICAgICAgICAgICAgICAvLyBgXCJgIGRlbGltaXRzIGEgSlNPTiBzdHJpbmc7IGFkdmFuY2UgdG8gdGhlIG5leHQgY2hhcmFjdGVyIGFuZFxuICAgICAgICAgICAgICAvLyBiZWdpbiBwYXJzaW5nIHRoZSBzdHJpbmcuIFN0cmluZyB0b2tlbnMgYXJlIHByZWZpeGVkIHdpdGggdGhlXG4gICAgICAgICAgICAgIC8vIHNlbnRpbmVsIGBAYCBjaGFyYWN0ZXIgdG8gZGlzdGluZ3Vpc2ggdGhlbSBmcm9tIHB1bmN0dWF0b3JzIGFuZFxuICAgICAgICAgICAgICAvLyBlbmQtb2Ytc3RyaW5nIHRva2Vucy5cbiAgICAgICAgICAgICAgZm9yICh2YWx1ZSA9IFwiQFwiLCBJbmRleCsrOyBJbmRleCA8IGxlbmd0aDspIHtcbiAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPCAzMikge1xuICAgICAgICAgICAgICAgICAgLy8gVW5lc2NhcGVkIEFTQ0lJIGNvbnRyb2wgY2hhcmFjdGVycyAodGhvc2Ugd2l0aCBhIGNvZGUgdW5pdFxuICAgICAgICAgICAgICAgICAgLy8gbGVzcyB0aGFuIHRoZSBzcGFjZSBjaGFyYWN0ZXIpIGFyZSBub3QgcGVybWl0dGVkLlxuICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoYXJDb2RlID09IDkyKSB7XG4gICAgICAgICAgICAgICAgICAvLyBBIHJldmVyc2Ugc29saWR1cyAoYFxcYCkgbWFya3MgdGhlIGJlZ2lubmluZyBvZiBhbiBlc2NhcGVkXG4gICAgICAgICAgICAgICAgICAvLyBjb250cm9sIGNoYXJhY3RlciAoaW5jbHVkaW5nIGBcImAsIGBcXGAsIGFuZCBgL2ApIG9yIFVuaWNvZGVcbiAgICAgICAgICAgICAgICAgIC8vIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgICBzd2l0Y2ggKGNoYXJDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgOTI6IGNhc2UgMzQ6IGNhc2UgNDc6IGNhc2UgOTg6IGNhc2UgMTE2OiBjYXNlIDExMDogY2FzZSAxMDI6IGNhc2UgMTE0OlxuICAgICAgICAgICAgICAgICAgICAgIC8vIFJldml2ZSBlc2NhcGVkIGNvbnRyb2wgY2hhcmFjdGVycy5cbiAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBVbmVzY2FwZXNbY2hhckNvZGVdO1xuICAgICAgICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTE3OlxuICAgICAgICAgICAgICAgICAgICAgIC8vIGBcXHVgIG1hcmtzIHRoZSBiZWdpbm5pbmcgb2YgYSBVbmljb2RlIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICAvLyBBZHZhbmNlIHRvIHRoZSBmaXJzdCBjaGFyYWN0ZXIgYW5kIHZhbGlkYXRlIHRoZVxuICAgICAgICAgICAgICAgICAgICAgIC8vIGZvdXItZGlnaXQgY29kZSBwb2ludC5cbiAgICAgICAgICAgICAgICAgICAgICBiZWdpbiA9ICsrSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgZm9yIChwb3NpdGlvbiA9IEluZGV4ICsgNDsgSW5kZXggPCBwb3NpdGlvbjsgSW5kZXgrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBIHZhbGlkIHNlcXVlbmNlIGNvbXByaXNlcyBmb3VyIGhleGRpZ2l0cyAoY2FzZS1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGluc2Vuc2l0aXZlKSB0aGF0IGZvcm0gYSBzaW5nbGUgaGV4YWRlY2ltYWwgdmFsdWUuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIShjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1NyB8fCBjaGFyQ29kZSA+PSA5NyAmJiBjaGFyQ29kZSA8PSAxMDIgfHwgY2hhckNvZGUgPj0gNjUgJiYgY2hhckNvZGUgPD0gNzApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEludmFsaWQgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIC8vIFJldml2ZSB0aGUgZXNjYXBlZCBjaGFyYWN0ZXIuXG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gZnJvbUNoYXJDb2RlKFwiMHhcIiArIHNvdXJjZS5zbGljZShiZWdpbiwgSW5kZXgpKTtcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAvLyBJbnZhbGlkIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gMzQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQW4gdW5lc2NhcGVkIGRvdWJsZS1xdW90ZSBjaGFyYWN0ZXIgbWFya3MgdGhlIGVuZCBvZiB0aGVcbiAgICAgICAgICAgICAgICAgICAgLy8gc3RyaW5nLlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgYmVnaW4gPSBJbmRleDtcbiAgICAgICAgICAgICAgICAgIC8vIE9wdGltaXplIGZvciB0aGUgY29tbW9uIGNhc2Ugd2hlcmUgYSBzdHJpbmcgaXMgdmFsaWQuXG4gICAgICAgICAgICAgICAgICB3aGlsZSAoY2hhckNvZGUgPj0gMzIgJiYgY2hhckNvZGUgIT0gOTIgJiYgY2hhckNvZGUgIT0gMzQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIEFwcGVuZCB0aGUgc3RyaW5nIGFzLWlzLlxuICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gc291cmNlLnNsaWNlKGJlZ2luLCBJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzb3VyY2UuY2hhckNvZGVBdChJbmRleCkgPT0gMzQpIHtcbiAgICAgICAgICAgICAgICAvLyBBZHZhbmNlIHRvIHRoZSBuZXh0IGNoYXJhY3RlciBhbmQgcmV0dXJuIHRoZSByZXZpdmVkIHN0cmluZy5cbiAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBVbnRlcm1pbmF0ZWQgc3RyaW5nLlxuICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgLy8gUGFyc2UgbnVtYmVycyBhbmQgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgIGJlZ2luID0gSW5kZXg7XG4gICAgICAgICAgICAgIC8vIEFkdmFuY2UgcGFzdCB0aGUgbmVnYXRpdmUgc2lnbiwgaWYgb25lIGlzIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDQ1KSB7XG4gICAgICAgICAgICAgICAgaXNTaWduZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gUGFyc2UgYW4gaW50ZWdlciBvciBmbG9hdGluZy1wb2ludCB2YWx1ZS5cbiAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KSB7XG4gICAgICAgICAgICAgICAgLy8gTGVhZGluZyB6ZXJvZXMgYXJlIGludGVycHJldGVkIGFzIG9jdGFsIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSA0OCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXggKyAxKSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KSkge1xuICAgICAgICAgICAgICAgICAgLy8gSWxsZWdhbCBvY3RhbCBsaXRlcmFsLlxuICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaXNTaWduZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAvLyBQYXJzZSB0aGUgaW50ZWdlciBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgZm9yICg7IEluZGV4IDwgbGVuZ3RoICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCkpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nyk7IEluZGV4KyspO1xuICAgICAgICAgICAgICAgIC8vIEZsb2F0cyBjYW5ub3QgY29udGFpbiBhIGxlYWRpbmcgZGVjaW1hbCBwb2ludDsgaG93ZXZlciwgdGhpc1xuICAgICAgICAgICAgICAgIC8vIGNhc2UgaXMgYWxyZWFkeSBhY2NvdW50ZWQgZm9yIGJ5IHRoZSBwYXJzZXIuXG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KSA9PSA0Nikge1xuICAgICAgICAgICAgICAgICAgcG9zaXRpb24gPSArK0luZGV4O1xuICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgdGhlIGRlY2ltYWwgY29tcG9uZW50LlxuICAgICAgICAgICAgICAgICAgZm9yICg7IHBvc2l0aW9uIDwgbGVuZ3RoICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChwb3NpdGlvbikpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nyk7IHBvc2l0aW9uKyspO1xuICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uID09IEluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgdHJhaWxpbmcgZGVjaW1hbC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIEluZGV4ID0gcG9zaXRpb247XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFBhcnNlIGV4cG9uZW50cy4gVGhlIGBlYCBkZW5vdGluZyB0aGUgZXhwb25lbnQgaXNcbiAgICAgICAgICAgICAgICAvLyBjYXNlLWluc2Vuc2l0aXZlLlxuICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSAxMDEgfHwgY2hhckNvZGUgPT0gNjkpIHtcbiAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgICAvLyBTa2lwIHBhc3QgdGhlIHNpZ24gZm9sbG93aW5nIHRoZSBleHBvbmVudCwgaWYgb25lIGlzXG4gICAgICAgICAgICAgICAgICAvLyBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gNDMgfHwgY2hhckNvZGUgPT0gNDUpIHtcbiAgICAgICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBleHBvbmVudGlhbCBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgICBmb3IgKHBvc2l0aW9uID0gSW5kZXg7IHBvc2l0aW9uIDwgbGVuZ3RoICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChwb3NpdGlvbikpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nyk7IHBvc2l0aW9uKyspO1xuICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uID09IEluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgZW1wdHkgZXhwb25lbnQuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBJbmRleCA9IHBvc2l0aW9uO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBDb2VyY2UgdGhlIHBhcnNlZCB2YWx1ZSB0byBhIEphdmFTY3JpcHQgbnVtYmVyLlxuICAgICAgICAgICAgICAgIHJldHVybiArc291cmNlLnNsaWNlKGJlZ2luLCBJbmRleCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gQSBuZWdhdGl2ZSBzaWduIG1heSBvbmx5IHByZWNlZGUgbnVtYmVycy5cbiAgICAgICAgICAgICAgaWYgKGlzU2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBgdHJ1ZWAsIGBmYWxzZWAsIGFuZCBgbnVsbGAgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgIGlmIChzb3VyY2Uuc2xpY2UoSW5kZXgsIEluZGV4ICsgNCkgPT0gXCJ0cnVlXCIpIHtcbiAgICAgICAgICAgICAgICBJbmRleCArPSA0O1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA1KSA9PSBcImZhbHNlXCIpIHtcbiAgICAgICAgICAgICAgICBJbmRleCArPSA1O1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChzb3VyY2Uuc2xpY2UoSW5kZXgsIEluZGV4ICsgNCkgPT0gXCJudWxsXCIpIHtcbiAgICAgICAgICAgICAgICBJbmRleCArPSA0O1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIFVucmVjb2duaXplZCB0b2tlbi5cbiAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmV0dXJuIHRoZSBzZW50aW5lbCBgJGAgY2hhcmFjdGVyIGlmIHRoZSBwYXJzZXIgaGFzIHJlYWNoZWQgdGhlIGVuZFxuICAgICAgICAvLyBvZiB0aGUgc291cmNlIHN0cmluZy5cbiAgICAgICAgcmV0dXJuIFwiJFwiO1xuICAgICAgfTtcblxuICAgICAgLy8gSW50ZXJuYWw6IFBhcnNlcyBhIEpTT04gYHZhbHVlYCB0b2tlbi5cbiAgICAgIHZhciBnZXQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIHJlc3VsdHMsIGhhc01lbWJlcnM7XG4gICAgICAgIGlmICh2YWx1ZSA9PSBcIiRcIikge1xuICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgZW5kIG9mIGlucHV0LlxuICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgaWYgKChjaGFySW5kZXhCdWdneSA/IHZhbHVlLmNoYXJBdCgwKSA6IHZhbHVlWzBdKSA9PSBcIkBcIikge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBzZW50aW5lbCBgQGAgY2hhcmFjdGVyLlxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnNsaWNlKDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBQYXJzZSBvYmplY3QgYW5kIGFycmF5IGxpdGVyYWxzLlxuICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIltcIikge1xuICAgICAgICAgICAgLy8gUGFyc2VzIGEgSlNPTiBhcnJheSwgcmV0dXJuaW5nIGEgbmV3IEphdmFTY3JpcHQgYXJyYXkuXG4gICAgICAgICAgICByZXN1bHRzID0gW107XG4gICAgICAgICAgICBmb3IgKDs7IGhhc01lbWJlcnMgfHwgKGhhc01lbWJlcnMgPSB0cnVlKSkge1xuICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAvLyBBIGNsb3Npbmcgc3F1YXJlIGJyYWNrZXQgbWFya3MgdGhlIGVuZCBvZiB0aGUgYXJyYXkgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiXVwiKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gSWYgdGhlIGFycmF5IGxpdGVyYWwgY29udGFpbnMgZWxlbWVudHMsIHRoZSBjdXJyZW50IHRva2VuXG4gICAgICAgICAgICAgIC8vIHNob3VsZCBiZSBhIGNvbW1hIHNlcGFyYXRpbmcgdGhlIHByZXZpb3VzIGVsZW1lbnQgZnJvbSB0aGVcbiAgICAgICAgICAgICAgLy8gbmV4dC5cbiAgICAgICAgICAgICAgaWYgKGhhc01lbWJlcnMpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJdXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVW5leHBlY3RlZCB0cmFpbGluZyBgLGAgaW4gYXJyYXkgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgLy8gQSBgLGAgbXVzdCBzZXBhcmF0ZSBlYWNoIGFycmF5IGVsZW1lbnQuXG4gICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBFbGlzaW9ucyBhbmQgbGVhZGluZyBjb21tYXMgYXJlIG5vdCBwZXJtaXR0ZWQuXG4gICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIikge1xuICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGdldCh2YWx1ZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSA9PSBcIntcIikge1xuICAgICAgICAgICAgLy8gUGFyc2VzIGEgSlNPTiBvYmplY3QsIHJldHVybmluZyBhIG5ldyBKYXZhU2NyaXB0IG9iamVjdC5cbiAgICAgICAgICAgIHJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgIGZvciAoOzsgaGFzTWVtYmVycyB8fCAoaGFzTWVtYmVycyA9IHRydWUpKSB7XG4gICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgIC8vIEEgY2xvc2luZyBjdXJseSBicmFjZSBtYXJrcyB0aGUgZW5kIG9mIHRoZSBvYmplY3QgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwifVwiKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gSWYgdGhlIG9iamVjdCBsaXRlcmFsIGNvbnRhaW5zIG1lbWJlcnMsIHRoZSBjdXJyZW50IHRva2VuXG4gICAgICAgICAgICAgIC8vIHNob3VsZCBiZSBhIGNvbW1hIHNlcGFyYXRvci5cbiAgICAgICAgICAgICAgaWYgKGhhc01lbWJlcnMpIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJ9XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVW5leHBlY3RlZCB0cmFpbGluZyBgLGAgaW4gb2JqZWN0IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIC8vIEEgYCxgIG11c3Qgc2VwYXJhdGUgZWFjaCBvYmplY3QgbWVtYmVyLlxuICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gTGVhZGluZyBjb21tYXMgYXJlIG5vdCBwZXJtaXR0ZWQsIG9iamVjdCBwcm9wZXJ0eSBuYW1lcyBtdXN0IGJlXG4gICAgICAgICAgICAgIC8vIGRvdWJsZS1xdW90ZWQgc3RyaW5ncywgYW5kIGEgYDpgIG11c3Qgc2VwYXJhdGUgZWFjaCBwcm9wZXJ0eVxuICAgICAgICAgICAgICAvLyBuYW1lIGFuZCB2YWx1ZS5cbiAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiIHx8IHR5cGVvZiB2YWx1ZSAhPSBcInN0cmluZ1wiIHx8IChjaGFySW5kZXhCdWdneSA/IHZhbHVlLmNoYXJBdCgwKSA6IHZhbHVlWzBdKSAhPSBcIkBcIiB8fCBsZXgoKSAhPSBcIjpcIikge1xuICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzdWx0c1t2YWx1ZS5zbGljZSgxKV0gPSBnZXQobGV4KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgdG9rZW4gZW5jb3VudGVyZWQuXG4gICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9O1xuXG4gICAgICAvLyBJbnRlcm5hbDogVXBkYXRlcyBhIHRyYXZlcnNlZCBvYmplY3QgbWVtYmVyLlxuICAgICAgdmFyIHVwZGF0ZSA9IGZ1bmN0aW9uKHNvdXJjZSwgcHJvcGVydHksIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBlbGVtZW50ID0gd2Fsayhzb3VyY2UsIHByb3BlcnR5LCBjYWxsYmFjayk7XG4gICAgICAgIGlmIChlbGVtZW50ID09PSB1bmRlZikge1xuICAgICAgICAgIGRlbGV0ZSBzb3VyY2VbcHJvcGVydHldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNvdXJjZVtwcm9wZXJ0eV0gPSBlbGVtZW50O1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAvLyBJbnRlcm5hbDogUmVjdXJzaXZlbHkgdHJhdmVyc2VzIGEgcGFyc2VkIEpTT04gb2JqZWN0LCBpbnZva2luZyB0aGVcbiAgICAgIC8vIGBjYWxsYmFja2AgZnVuY3Rpb24gZm9yIGVhY2ggdmFsdWUuIFRoaXMgaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgdGhlXG4gICAgICAvLyBgV2Fsayhob2xkZXIsIG5hbWUpYCBvcGVyYXRpb24gZGVmaW5lZCBpbiBFUyA1LjEgc2VjdGlvbiAxNS4xMi4yLlxuICAgICAgdmFyIHdhbGsgPSBmdW5jdGlvbiAoc291cmNlLCBwcm9wZXJ0eSwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHZhbHVlID0gc291cmNlW3Byb3BlcnR5XSwgbGVuZ3RoO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIgJiYgdmFsdWUpIHtcbiAgICAgICAgICAvLyBgZm9yRWFjaGAgY2FuJ3QgYmUgdXNlZCB0byB0cmF2ZXJzZSBhbiBhcnJheSBpbiBPcGVyYSA8PSA4LjU0XG4gICAgICAgICAgLy8gYmVjYXVzZSBpdHMgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAgaW1wbGVtZW50YXRpb24gcmV0dXJucyBgZmFsc2VgXG4gICAgICAgICAgLy8gZm9yIGFycmF5IGluZGljZXMgKGUuZy4sIGAhWzEsIDIsIDNdLmhhc093blByb3BlcnR5KFwiMFwiKWApLlxuICAgICAgICAgIGlmIChnZXRDbGFzcy5jYWxsKHZhbHVlKSA9PSBhcnJheUNsYXNzKSB7XG4gICAgICAgICAgICBmb3IgKGxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgbGVuZ3RoLS07KSB7XG4gICAgICAgICAgICAgIHVwZGF0ZSh2YWx1ZSwgbGVuZ3RoLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvckVhY2godmFsdWUsIGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICB1cGRhdGUodmFsdWUsIHByb3BlcnR5LCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwoc291cmNlLCBwcm9wZXJ0eSwgdmFsdWUpO1xuICAgICAgfTtcblxuICAgICAgLy8gUHVibGljOiBgSlNPTi5wYXJzZWAuIFNlZSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4yLlxuICAgICAgSlNPTjMucGFyc2UgPSBmdW5jdGlvbiAoc291cmNlLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmVzdWx0LCB2YWx1ZTtcbiAgICAgICAgSW5kZXggPSAwO1xuICAgICAgICBTb3VyY2UgPSBcIlwiICsgc291cmNlO1xuICAgICAgICByZXN1bHQgPSBnZXQobGV4KCkpO1xuICAgICAgICAvLyBJZiBhIEpTT04gc3RyaW5nIGNvbnRhaW5zIG11bHRpcGxlIHRva2VucywgaXQgaXMgaW52YWxpZC5cbiAgICAgICAgaWYgKGxleCgpICE9IFwiJFwiKSB7XG4gICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBSZXNldCB0aGUgcGFyc2VyIHN0YXRlLlxuICAgICAgICBJbmRleCA9IFNvdXJjZSA9IG51bGw7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayAmJiBnZXRDbGFzcy5jYWxsKGNhbGxiYWNrKSA9PSBmdW5jdGlvbkNsYXNzID8gd2FsaygodmFsdWUgPSB7fSwgdmFsdWVbXCJcIl0gPSByZXN1bHQsIHZhbHVlKSwgXCJcIiwgY2FsbGJhY2spIDogcmVzdWx0O1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvLyBFeHBvcnQgZm9yIGFzeW5jaHJvbm91cyBtb2R1bGUgbG9hZGVycy5cbiAgaWYgKGlzTG9hZGVyKSB7XG4gICAgZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBKU09OMztcbiAgICB9KTtcbiAgfVxufSh0aGlzKSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRvQXJyYXlcblxuZnVuY3Rpb24gdG9BcnJheShsaXN0LCBpbmRleCkge1xuICAgIHZhciBhcnJheSA9IFtdXG5cbiAgICBpbmRleCA9IGluZGV4IHx8IDBcblxuICAgIGZvciAodmFyIGkgPSBpbmRleCB8fCAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICBhcnJheVtpIC0gaW5kZXhdID0gbGlzdFtpXVxuICAgIH1cblxuICAgIHJldHVybiBhcnJheVxufVxuIiwiLy8gIEluY2x1ZGUgbnBtIHBhdGhmaW5kaW5nIGxpYnJhcnlcbnZhciBwYXRoRmluZGluZyA9IHJlcXVpcmUoJ3BhdGhmaW5kaW5nJyk7XG5cbi8vICBJbmNsdWRlIG5wbSBzb2NrZXQuaW8tY2xpZW50IGxpYnJhcnlcbnZhciBpbyA9IHJlcXVpcmUoJ3NvY2tldC5pby1jbGllbnQnKTtcbnZhciBzb2NrZXQgPSBpbygnaHR0cDovLzEyNy4wLjAuMToxMzM3Jyk7XG5cbi8vICBJbXBvcnQgY2xhc3Nlc1xuaW1wb3J0IHtXb3JsZH0gZnJvbSAnLi93b3JsZCc7XG5cbi8vICBDcmVhdGUgbmV3IFdvcmxkXG52YXIgcG9seXdvcmxkID0gbmV3IFdvcmxkKCk7XG5cbi8vICBHZW5lcmF0ZSB0aGUgYmluYXJ5IG1hcFxucG9seXdvcmxkLnRvQmluYXJ5TWF0cml4KCk7XG5cbi8vICBBZGQgcG9seW1lciBldmVudCBsaXN0ZW5lclxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvbHltZXItcmVhZHknLFxuICBldmVudCA9PiB7XG4gICAgLy8gIFNlbGVjdCBnYW1lIHN0YWdlXG4gICAgdmFyIGdhbWVTdGFnZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2dhbWUtc3RhZ2UnKTtcbiAgICAvLyAgSW5pdCBwYXRoRmluZGluZyBwcm9wZXJ0eVxuICAgIGdhbWVTdGFnZS5wYXRoRmluZGluZyA9IHBhdGhGaW5kaW5nO1xuICAgIC8vICBJbml0IHNvY2tldCBwcm9wZXJ0eVxuICAgIGdhbWVTdGFnZS5zb2NrZXQgPSBzb2NrZXQ7XG4gICAgLy8gIEluaXQgd29ybGQgcHJvcGVydHlcbiAgICBnYW1lU3RhZ2Uud29ybGQgPSBwb2x5d29ybGQubWFwO1xuICAgIC8vICBJbml0IGJpbmFyeSBtYXAgcHJvcGVydHlcbiAgICBnYW1lU3RhZ2UuYmluYXJ5TWFwID0gcG9seXdvcmxkLmJpbmFyeU1hcDtcbiAgfSk7XG4iLCJleHBvcnQgY2xhc3MgV29ybGQge1xuXG4gIGNvbnN0cnVjdG9yKG1hcCkge1xuICAgIC8vICBUaGUgd29ybGQgbWFwXG4gICAgdGhpcy5tYXAgPSBbXG4gICAgICBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMSwgMSwgMCwgMCwgMSwgMCwgMCwgMCwgMSwgMCwgMiwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMSwgMCwgMSwgMCwgMCwgMCwgMCwgMywgMCwgNCwgMCwgMywgNSwgMCwgMywgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMCwgMCwgMCwgNCwgMiwgMCwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMCwgMCwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMywgMCwgMywgMSwgMSwgMCwgNCwgMCwgMywgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMCwgMCwgMCwgMSwgMCwgMSwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMCwgMCwgMywgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0sXG4gICAgICBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF1cbiAgICBdO1xuICAgIC8vICBEZWZpbmUgd2hpY2ggc3ByaXRlcyBhcmUgY3Jvc3NhYmxlXG4gICAgdGhpcy5jcm9zc2FibGVTcHJpdGVzID0gWzAsIDNdO1xuICB9XG5cbiAgLy8gIE1ldGhvZCB0byB0ZXN0IGlmIGEgc3ByaXRlIGlzIGNyb3NzYWJsZVxuICBpc0Nyb3NzYWJsZSh0eXBlKSB7XG4gICAgcmV0dXJuIHRoaXMuY3Jvc3NhYmxlU3ByaXRlcy5pbmRleE9mKHR5cGUpICE9PSAtMSA/IHRydWUgOiBmYWxzZTtcbiAgfVxuXG4gIC8vICBNZXRob2QgdG8gZ2VuZXJhdGUgdGhlIGJpbmFyeSBtYXAgb2YgY3Jvc3NhYmxlIHNwcml0ZXNcbiAgdG9CaW5hcnlNYXRyaXgoKSB7XG4gICAgdGhpcy5iaW5hcnlNYXAgPSBbXTtcbiAgICB2YXIgdG9CaW5hcnkgPSB2YWx1ZSA9PiB0aGlzLmlzQ3Jvc3NhYmxlKHZhbHVlKSA/IDAgOiAxO1xuICAgIHRoaXMubWFwLmZvckVhY2gocm93ID0+IHRoaXMuYmluYXJ5TWFwLnB1c2gocm93Lm1hcCh0b0JpbmFyeSkpKTtcbiAgfVxuXG59XG4iXX0=
