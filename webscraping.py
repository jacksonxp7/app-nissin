import requests
from bs4 import BeautifulSoup
import json

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}


def sopas(url):
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    sopa = soup.prettify()

    images = soup.find_all('img')

    for image in images:
        print(image['src'])







def print_prices(novaimagem,novopreço):
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
            


print_prices('nova_imagem.jpg', 0)
