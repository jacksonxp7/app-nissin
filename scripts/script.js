
import { abastecer_screen } from './abastecimento.js';
import {itens} from './estoque.js'
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, doc, addDoc, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { header } from './header.js';
import {verificar_login} from './login.js'
import {pushvalidade} from './login.js'
import {validadesfunc} from './validade.js'
import { layout } from './layout.js';


header();
abastecer_screen();
verificar_login()
validadesfunc()
itens();
pushvalidade();
layout()
