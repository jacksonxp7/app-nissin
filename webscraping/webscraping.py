from bs4 import BeautifulSoup
import time
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from firebase_init import db
from datetime import datetime
import re


def sanitize_id(text):
    return re.sub(r'[\/.#$\[\]]', '_', text.lower())


def atualizar_categoria(categoria):
    doc_categoria = db.collection("produtos").document(categoria)

    doc_categoria.set({
        "atualizadoEm": datetime.now().strftime("%Y-%m-%d")
    }, merge=True)


def salvar_produto_firebase(categoria, produto):
    doc_ref = (
        db.collection("produtos")
        .document(categoria)
        .collection("itens")
        .document(sanitize_id(produto["nome"]))
    )

    doc_ref.set(produto, merge=True)

    # 🔥 ATUALIZA O DOCUMENTO DA CATEGORIA
    atualizar_categoria(categoria)

    print(f"✔ {produto['nome']} salvo/atualizado em {categoria}")


def sopas(url, categoria):
    options = Options()
    options.add_argument("--headless")
    driver = webdriver.Firefox(options=options)

    try:
        driver.get(url)
        time.sleep(5)

        soup = BeautifulSoup(driver.page_source, 'html.parser')
        produtos = soup.find_all('li', class_='product-item')

        if not produtos:
            print(f"Nenhum produto encontrado em {categoria}")
            return

        for produto in produtos:
            nomes = produto.find_all('a', class_='product-item-link')
            imagem = produto.find('img', class_='product-image-photo')
            preco = produto.find('span', class_='price')

            if not nomes or not imagem or not preco:
                continue

            nome_texto = (
                nomes[1].get_text(strip=True)
                if len(nomes) > 1
                else nomes[0].get_text(strip=True)
            )

            item = {
                "nome": nome_texto,
                "preco": preco.get_text(strip=True).replace("R$", "").strip(),
                "imagem": imagem.get("src"),
                "marca": categoria,
                "tipo": categoria
            }
            print(f"✔ {item['nome']} salvo/atualizado em {categoria}")
            salvar_produto_firebase(categoria, item)

    except Exception as e:
        print(f"[!] Erro ao processar '{categoria}': {e}")

    finally:
        driver.quit()


# =========================
# EXECUÇÃO
# =========================

sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=nissin', 'nissin')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/index/?brand=5619&q=bifum', 'nissin')

sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=ferrero', 'ferrero')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=kinder', 'kinder')

sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/index/?brand=4483&q=M%26Ms', 'm&m')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/index/?brand=4537&q=snickers', 'snickers')

sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/index/?brand=4240&q=fini', 'fini')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=santa+helena', 'santa helena')

sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=ajinomoto', 'ajinomoto')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=sazon', 'ajinomoto')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/index/?brand=3368&cat=46&q=Ami', 'ajinomoto')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/index/?brand=1349&q=Mid', 'ajinomoto')

sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=ingleza', 'ingleza')
