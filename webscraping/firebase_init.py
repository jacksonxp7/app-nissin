import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("webscraping/firebase-key.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

# 👇 exporta firestore também
fs = firestore
