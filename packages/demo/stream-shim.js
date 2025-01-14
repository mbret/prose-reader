export function Stream() {
  console.log('Stream');
}

export const stream = {
  Stream: function Stream() {},
};

stream.Stream.prototype = Stream.prototype;
