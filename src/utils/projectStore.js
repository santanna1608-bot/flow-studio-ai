let connection;
function database() {
  if (!connection) connection = new Promise((resolve, reject) => {
    const request = indexedDB.open('flow-studio', 1);
    const timeout = setTimeout(() => reject(new Error('Armazenamento local não respondeu.')), 10000);
    request.onblocked = () => { clearTimeout(timeout); reject(new Error('Feche outras abas do Flow Studio e tente novamente.')); };
    request.onupgradeneeded = () => request.result.createObjectStore('projects');
    request.onsuccess = () => { clearTimeout(timeout); resolve(request.result); };
    request.onerror = () => { clearTimeout(timeout); reject(request.error); };
  });
  return connection;
}
export async function loadProject() {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction('projects').objectStore('projects').get('current');
    request.onsuccess = () => resolve(request.result?.version === 1 ? request.result.project : null);
    request.onerror = () => reject(request.error);
  });
}
export async function saveProject(project) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite');
    tx.objectStore('projects').put({ version: 1, project }, 'current');
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Falha ao salvar.'));
  });
}
