// This code copied from excellent recompose: package https://github.com/acdlite/recompose/blob/master/src/packages/recompose/setObservableConfig.js
// All credit goes to Andrew Clark his excellent work.

let _config = {
  fromESObservable: null,
  toESObservable: null
}

const configureObservable = c => {
  _config = c
}

export const config = {
  fromESObservable: observable =>
    typeof _config.fromESObservable === 'function'
      ? _config.fromESObservable(observable)
      : observable,
  toESObservable: stream =>
    typeof _config.toESObservable === 'function'
      ? _config.toESObservable(stream)
      : stream
}

export default configureObservable
