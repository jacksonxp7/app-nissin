from bs4 import BeautifulSoup
import time
import requests
import json
from selenium import webdriver
import os
from selenium.webdriver.firefox.options import Options

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive"
}


def print_prices(novaimagem, novopreço):
    try:
        with open('produtos.json', 'r') as file:
            data = json.load(file)
            print("Arquivo JSON carregado com sucesso!")
    except FileNotFoundError:
        data = []
        print("Arquivo JSON não encontrado. Criando um novo arquivo.")

    for categoria, produtos in data.items():
        for item in produtos:

            preco = item.get("preco", None)
            if preco is None:
                item["preco"] = novopreço
                with open('produtos.json', 'w') as file:
                    json.dump(data, file, indent=4)

            imagem = item.get("imagem", None)
            if imagem is None or imagem == "sem_imagem":
                item["imagem"] = novaimagem
                print('imagem alterada')

                with open('produtos.json', 'w') as file:
                    json.dump(data, file, indent=4)

            nome = item.get("nome", "Nome desconhecido")
            marca = item.get("marca", "Marca desconhecida")


# def sopas(url, categoria, arquivo_json='teste.json'):

#     options = Options()
#     options.add_argument("--headless") 
#     driver = webdriver.Firefox(options=options)

#     try:
#         driver.get(url)
#         time.sleep(5)

#         soup = BeautifulSoup(driver.page_source, 'html.parser')
#         produtos = soup.find_all('li', class_='product-item')
#         dados = []

#         for produto in produtos:
#             nomes = produto.find_all('a', class_='product-item-link')
#             imagem = produto.find('img', class_='product-image-photo')
#             preco = produto.find('span', class_='price')

           
#             if not nomes or not imagem or not preco:
#                 continue

#             nome_texto = nomes[1].get_text(strip=True) if len(
#                 nomes) > 1 else nomes[0].get_text(strip=True)
#             imagem_url = imagem.get('src', 'Imagem não encontrada')
#             preco_texto = preco.get_text(strip=True)

#             dados.append({
#                 "nome": nome_texto,
#                 "preco": preco_texto,
#                 "imagem": imagem_url,
#                 "marca": categoria,
#                 "tipo": categoria    
#             })
#             print(nome_texto,preco_texto,imagem_url,categoria+" adicionado com sucesso")

#         if not dados:
#             print(f"Nenhum produto válido encontrado para '{categoria}'.")
#             return

#         if os.path.exists(arquivo_json):
#             with open(arquivo_json, 'r', encoding='utf-8') as f:
#                 conteudo = json.load(f)
#         else:
#             conteudo = {}

#         dados = sorted(dados, key=lambda x: x['nome'].lower()) 
#         conteudo[categoria] = dados


#         with open(arquivo_json, 'w', encoding='utf-8') as f:
#             json.dump(conteudo, f, ensure_ascii=False, indent=4)

#         print(
#             f"[✓] Dados da categoria '{categoria}' salvos em {arquivo_json} com sucesso.")

#     except Exception as e:
#         print(f"[!] Erro ao processar a categoria '{categoria}': {e}")

#     finally:
#         driver.quit()

def sopas(url, categoria, arquivo_json='teste.json'):
    options = Options()
    options.add_argument("--headless") 
    driver = webdriver.Firefox(options=options)

    try:
        driver.get(url)
        time.sleep(5)

        soup = BeautifulSoup(driver.page_source, 'html.parser')
        produtos = soup.find_all('li', class_='product-item')
        novos_dados = []

        for produto in produtos:
            nomes = produto.find_all('a', class_='product-item-link')
            imagem = produto.find('img', class_='product-image-photo')
            preco = produto.find('span', class_='price')

            if not nomes or not imagem or not preco:
                continue

            nome_texto = nomes[1].get_text(strip=True) if len(nomes) > 1 else nomes[0].get_text(strip=True)
            imagem_url = imagem.get('src', 'Imagem não encontrada')
            preco_texto = preco.get_text(strip=True)

            novos_dados.append({
                "nome": nome_texto,
                "preco": preco_texto,
                "imagem": imagem_url,
                "marca": categoria,
                "tipo": categoria    
            })
            print(nome_texto, preco_texto, imagem_url, categoria + " adicionado com sucesso")

        if not novos_dados:
            print(f"Nenhum produto válido encontrado para '{categoria}'.")
            return

        if os.path.exists(arquivo_json):
            with open(arquivo_json, 'r', encoding='utf-8') as f:
                conteudo = json.load(f)
        else:
            conteudo = {}

        # Carrega dados já existentes e adiciona os novos
        if categoria not in conteudo:
            conteudo[categoria] = []

        nomes_existentes = set(produto['nome'] for produto in conteudo[categoria])
        for item in novos_dados:
            if item['nome'] not in nomes_existentes:
                conteudo[categoria].append(item)

        conteudo[categoria] = sorted(conteudo[categoria], key=lambda x: x['nome'].lower())

        with open(arquivo_json, 'w', encoding='utf-8') as f:
            json.dump(conteudo, f, ensure_ascii=False, indent=4)

        print(f"[✓] Dados da categoria '{categoria}' salvos em {arquivo_json} com sucesso.")

    except Exception as e:
        print(f"[!] Erro ao processar a categoria '{categoria}': {e}")

    finally:
        driver.quit()


sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=nissin', 'lamen')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=Bifum', 'lamen')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=ferrero', 'chocolate')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=kinder', 'chocolate')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=M%26Ms', 'chocolate')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=snickers', 'chocolate')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/index/?brand=4240&q=fini', 'fini')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=santa+helena', 'santa helena')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=ajinomoto', 'ajinomoto')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=sazon', 'ajinomoto')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=Ami&cat=46', 'ajinomoto')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/index/?brand=1349&q=Mid', 'ajinomoto')
sopas('https://tauste.com.br/sorocaba3/catalogsearch/result/?q=ingleza', 'inglesa')






 

