import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDjsC8vlXZ15pxsqwda8vh5OGIu3ZU_9N0",
    authDomain: "viso-task-dc14f.firebaseapp.com",
    projectId: "viso-task-dc14f",
    storageBucket: "viso-task-dc14f.appspot.com",
    messagingSenderId: "541656881952",
    appId: "1:541656881952:web:5c077d08ef9eccc8041545",
    measurementId: "G-J3PFG1QYQC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
