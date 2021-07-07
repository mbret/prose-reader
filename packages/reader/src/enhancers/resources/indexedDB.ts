const createDatabase = (db: IDBDatabase) => {

  const put = (key: string, data: Blob) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([`store`], `readwrite`)

      transaction.onerror = function (event) {
        reject(event)
      };

      transaction.oncomplete = function () {
        resolve()
      };

      const objectStore = transaction.objectStore(`store`)
      const listener = objectStore.put(data, key)

      listener.onsuccess = () => {
        resolve()
      }

      listener.onerror = (event) => {
        reject(event)
      }
    })
  }

  const get = (key: IDBValidKey) => {
    return new Promise<Blob>((resolve, reject) => {
      const transaction = db.transaction([`store`], `readwrite`)
      const objectStore = transaction.objectStore(`store`)
      const request = objectStore.get(key)

      request.onsuccess = () => {
        let value = request.result;
        if (value === undefined) {
          value = null;
        }
        resolve(value);
      }

      transaction.onerror = function () {
        reject(request.error)
      };
    })
  }

  const remove = (key: IDBValidKey) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([`store`], `readwrite`)

      const objectStore = transaction.objectStore(`store`)
      const request = objectStore.delete(key)

      transaction.onerror = function () {
        reject(request.error)
      };

      transaction.oncomplete = function () {
        resolve()
      };

      // The request will be also be aborted if we've exceeded our storage
      // space.
      transaction.onabort = function () {
        var err = request.error
          ? request.error
          : request.transaction?.error;
        reject(err);
      };
    })
  }

  const keys = () => {
    return new Promise<IDBValidKey[]>((resolve, reject) => {
      const transaction = db.transaction([`store`], `readonly`)

      transaction.onerror = function (event) {
        reject(event)
      };

      // transaction.oncomplete = function () {
      //   resolve()
      // };

      const objectStore = transaction.objectStore(`store`)
      const request = objectStore.openKeyCursor()
      const keys: IDBValidKey[] = []

      request.onsuccess = () => {
        let cursor = request.result;

        if (!cursor) {
          resolve(keys);
          return;
        }

        keys.push(cursor.key);
        cursor.continue();
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  return {
    put,
    keys,
    get,
    remove,
  }
}

export const openDatabase = async (name: string) => {
  return new Promise<ReturnType<typeof createDatabase>>((resolve, reject) => {
    const request = window.indexedDB.open(name)

    request.onerror = function (event) {
      reject(event)
    };

    request.onsuccess = function () {
      resolve(createDatabase(request.result))
    };

    request.onupgradeneeded = () => {
      request.result.createObjectStore(`store`)
    }
  })
}