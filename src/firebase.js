// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDMpOUSsrTaDI5cj66jUKCqx--rK_sRwVE",
    authDomain: "tongits-19bc2.firebaseapp.com",
    databaseURL: "https://tongits-19bc2-default-rtdb.firebaseio.com/",
    projectId: "tongits-19bc2",
    storageBucket: "tongits-19bc2.firebasestorage.app",
    messagingSenderId: "298419255302",
    appId: "1:298419255302:web:13403f38cf05f073c7eb87",
    measurementId: "G-L4KKTS21J1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)

const database = getDatabase(app)

export { database }