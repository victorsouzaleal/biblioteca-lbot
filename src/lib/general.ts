import axios from 'axios'
import {prettyNum} from 'pretty-num'
import translate from '@vitalets/google-translate-api'
import google from '@victorsouzaleal/googlethis'
import { OrganicResult, search } from 'google-sr'
import Genius from 'genius-lyrics'
import qs from 'querystring'
import { timestampToDate } from './util.js'
import {obterDadosBrasileiraoA, obterDadosBrasileiraoB, DadosBrasileirao} from '@victorsouzaleal/brasileirao'
import {JSDOM} from 'jsdom'
import UserAgent from 'user-agents'
import { AnimeRelease, CurrencyConvert, MangaRelease, MusicLyrics, News, WebSearch, Wheather } from './interfaces.js'

export async function simSimi(text: string){
    try {
        const URL_BASE = 'https://api.simsimi.vn/v2/simtalk'
        const config = {
            url: URL_BASE,
            method: "post",
            headers : {'Content-Type': 'application/x-www-form-urlencoded'},
            data : qs.stringify({text, lc: 'pt'})
        }

        const {data : simiResponse} = await axios(config).catch((err)=>{
            if(err.response?.data?.message) return err.response.data
            else throw new Error("Houve um erro ao obter resposta do SimSimi, tente novamente mais tarde.")
        })

        return simiResponse.message as string
    } catch(err){
        throw err
    }
}

export async function animeReleases(){
    try {
        const URL_BASE = 'https://animedays.org/'

        const {data : animesResponse} = await axios.get(URL_BASE, {headers: {"User-Agent": new UserAgent().toString()}}).catch(()=>{
            throw new Error("Houve um erro ao obter dados de animes, tente novamente mais tarde.")
        })

        const { window : { document } } = new JSDOM(animesResponse)
        let $animes = document.querySelectorAll('div.postbody > div:nth-child(2) > div.listupd.normal > div.excstf > article > div')
        let animes : AnimeRelease[] = []

        $animes.forEach($anime =>{
            let name = $anime.querySelector('a > div.tt > h2')?.innerHTML
            let episode = $anime.querySelector('a > div.limit > div.bt > span.epx')?.innerHTML
            let url = $anime.querySelector('a')?.href

            if(!name || !episode || !url) throw new Error("Houve um erro ao coletar os dados dos animes.")

            name = name.split("Episódio")[0]
            animes.push({
                name,
                episode,
                url
            })
        })

        return animes
    } catch(err){
        throw err
    }
}

export async function mangaReleases(){
    try {
        const URL_BASE = 'https://mangabr.net/'

        const {data : mangasResponse} = await axios.get(URL_BASE, {headers: {"User-Agent": new UserAgent().toString()}}).catch(() => {
            throw new Error("Houve um erro ao obter dados de mangás, tente novamente mais tarde.")
        })

        const { window : { document } } = new JSDOM(mangasResponse)
        let $mangas = document.querySelectorAll('div.col-6.col-sm-3.col-md-3.col-lg-2.p-1')
        let mangas : MangaRelease[] = []

        $mangas.forEach($manga =>{
            let name = $manga.querySelector('h3.chapter-title > span.series-name')?.innerHTML.trim()
            let chapter = $manga.querySelector('h3.chapter-title > span.chapter-name')?.innerHTML.trim()
            let url = `https://mangabr.net${$manga.querySelector('a.link-chapter')?.getAttribute('href')}`
            
            if(!name || !chapter) throw new Error("Houve um erro ao coletar os dados dos mangás.")

            mangas.push({
                name,
                chapter,
                url
            })
        })

        return mangas
    } catch(err){
        throw err
    }
}

export async function brasileiraoTable(serie : "A" | "B"){
    try {
        let table : DadosBrasileirao | undefined

        if(serie == "A"){
            table = await obterDadosBrasileiraoA().catch(() => {
                throw new Error("Houve um erro ao obter a tabela da série A do Brasileirão, tente novamente mais tarde.")
            })
        } else if(serie == "B"){
            table = await obterDadosBrasileiraoB().catch(() => {
                throw new Error("Houve um erro ao obter a tabela da série B do Brasileirão, tente novamente mais tarde.")
            })
        } 
        
        if(!table) throw new Error("Série não suportada")
    
        return table
    } catch(err) {
        throw err
    }
}

export async function moviedbTrendings(type : 'movie' | 'tv' = "movie"){
    try {
        let num = 0
        const BASE_URL = `https://api.themoviedb.org/3/trending/${type}/day?api_key=6618ac868ff51ffa77d586ee89223f49&language=pt-BR`

        const {data : movieDbResponse} = await axios.get(BASE_URL).catch(() => {
            throw new Error(`Houve um erro ao listar ${type === 'movie' ? "os filmes" : "as séries"}, tente novamente mais tarde.`)
        })

        const trendings : string = movieDbResponse.results.map((item: { title: string; name: string; overview: string })=>{
            num++
            return `${num}°: *${item.title || item.name}.*\n\`Sinopse:\` ${item.overview} \n`
        }).join('\n')

        return trendings
    } catch(err) {
        throw err
    }
}

export async function calcExpression(expr: string){
    try {
        const URL_BASE = 'https://api.mathjs.org/v4/'
        expr = expr.replace(/[Xx\xD7]/g, "*")
        expr = expr.replace(/\xF7/g, "/")
        expr = expr.replace(/,/g,".")
        expr = expr.replace("em","in")

        const {data : calcResponse} = await axios.post(URL_BASE, {expr}).catch(() => {
            throw new Error('Houve um erro ao obter resultado do cálculo, tente novamente mais tarde.')
        })

        let calcResult = calcResponse.result;

        if(calcResult == "NaN" || calcResult == "Infinity") throw new Error('Foi feita uma divisão por 0 ou algum outro cálculo inválido.')
        
        calcResult = calcResult.split(" ")
        calcResult[0] = (calcResult[0].includes("e")) ? prettyNum(calcResult[0]) : calcResult[0]
        calcResult = calcResult.join(" ")
        
        return calcResult as string
    } catch(err) {
        throw err
    }
}

export async function newsGoogle(lang = 'pt'){
    try {
        const newsList = await google.getTopNews(lang).catch(() => {
            throw new Error ("Houve um erro ao obter notícias, tente novamente mais tarde.")
        })
        
        let newsResponse : News[] = []

        for(let news of newsList.headline_stories){
            newsResponse.push({
                title : news.title,
                published : news.published,
                author: news.by,
                url : news.url
            })
        }

        return newsResponse
    } catch(err) {
        throw err
    }
}

export async function translationGoogle(text: string, lang: "pt" | "es" | "en" | "ja" | "it" | "ru" | "ko"){
    try {
        const translationResponse = await translate(text , {to: lang}).catch(() => {
            throw new Error('Houve um erro ao obter tradução, tente novamente mais tarde.')
        })

        return translationResponse.text
    } catch (err){
        throw err
    }
}

export async function shortenUrl(url: string){
    try {
        const URL_BASE = 'https://shorter.me/page/shorten'

        const {data : shortenResponse} = await axios.post(URL_BASE, qs.stringify({url, alias: '', password: ''})).catch(() => {
            throw new Error(`Houve um erro ao obter link encurtado, tente novamente mais tarde.`)
        })

        if(!shortenResponse.data) throw new Error(`O link inserido é inválido e não foi possível encurtar.`)
        
        return shortenResponse.data as string
    } catch(err) {
        throw err
    }
}

export async function webSearchGoogle(texto: string){
    try {
        const searchResults = await search({query : texto, resultTypes: [OrganicResult]}).catch(() => {
            throw new Error("Houve um erro ao obter a pesquisa do Google, tente novamente mais tarde.")
        })

        if(!searchResults.length) throw new Error ("Não foram encontrados resultados para esta pesquisa.")

        let searchResponse : WebSearch[] = []

        for(let search of searchResults){
            searchResponse.push({
                title: search.title,
                url: search.link,
                description : search.description
            })
        }

        return searchResponse
    } catch(err) {
        throw err
    }
}

export async function wheatherInfo(location: string){
    try {
        const WEATHER_API_URL = `http://api.weatherapi.com/v1/forecast.json?key=516f58a20b6c4ad3986123104242805&q=${encodeURIComponent(location)}&days=3&aqi=no&alerts=no`
        
        const {data : wheatherResult} = await axios.get(WEATHER_API_URL).catch(() => {
            throw new Error("Houve um erro ao obter dados de clima, tente novamente mais tarde.")
        })

        const {data: wheatherConditions} = await axios.get("https://www.weatherapi.com/docs/conditions.json", {responseType: 'json'}).catch(() => {
            throw new Error("Houve um erro ao obter dados de condições climáticas, tente novamente mais tarde.")
        })

        const currentCondition = wheatherConditions.find((condition: { code: number }) => 
            condition.code === wheatherResult.current.condition.code
        ).languages.find((language: { lang_iso: string }) =>
            language.lang_iso == 'pt'
        )

        let weatherResponse : Wheather = {
            location: {
                name: wheatherResult.location.name,
                region: wheatherResult.location.region,
                country: wheatherResult.location.country,
                current_time: timestampToDate(wheatherResult.location.localtime_epoch * 1000)
            },
            current: {
                last_updated: timestampToDate(wheatherResult.current.last_updated_epoch * 1000),
                temp: `${wheatherResult.current.temp_c} C°`,
                feelslike: `${wheatherResult.current.feelslike_c} C°`,
                condition: wheatherResult.current.is_day ? currentCondition.day_text : currentCondition.night_text,
                wind: `${wheatherResult.current.wind_kph} Km/h`,
                humidity: `${wheatherResult.current.humidity} %`,
                cloud: `${wheatherResult.current.cloud} %`
            },
            forecast: []
        }

        wheatherResult.forecast.forecastday.forEach((forecast : any) => {
            const conditionDay = wheatherConditions.find((condition: { code: number }) =>
                condition.code == forecast.day.condition.code
            ).languages.find((lang: { lang_iso: string }) => 
                lang.lang_iso == 'pt'
            )
            const [year, month, day] = forecast.date.split("-")
            const forecastDay = {
                day : `${day}/${month}/${year}`,
                max: `${forecast.day.maxtemp_c} C°`,
                min: `${forecast.day.mintemp_c} C°`,
                avg: `${forecast.day.avgtemp_c} C°`,
                condition: `${conditionDay.day_text}`,
                max_wind: `${forecast.day.maxwind_kph} Km/h`,
                rain : `${forecast.day.daily_will_it_rain ? "Sim" : "Não"}`,
                chance_rain : `${forecast.day.daily_chance_of_rain} %`,
                snow: `${forecast.day.daily_will_it_snow ? "Sim" : "Não"}`,
                chance_snow : `${forecast.day.daily_chance_of_snow} %`,
                uv: forecast.day.uv
            }
            weatherResponse.forecast.push(forecastDay)
        })

        return weatherResponse
    } catch(err) {
        throw err
    }
}

export async function musicLyrics(text: string){
    try {
        const geniusClient = new Genius.Client()

        const musicSearch = await geniusClient.songs.search(text).catch((err) => {
            if(err.message == "No result was found") throw new Error("A letra da música não foi encontrada")
            else throw new Error("Houve um erro ao obter a letra da música, tente novamente mais tarde.")
        })

        const musicResult : MusicLyrics = {
            title: musicSearch[0].title,
            artist: musicSearch[0].artist.name,
            image : musicSearch[0].artist.image,
            lyrics: await musicSearch[0].lyrics()
        }

        return musicResult
    } catch(err) {
        throw err
    }
}

export async function convertCurrency(currency: "dolar" | "euro" | "real" | "iene", value: number){
    try {
        const URL_BASE = 'https://economia.awesomeapi.com.br/json/last/'
        value = parseInt(value.toString().replace(",","."))
        let params : string | undefined

        if(isNaN(value)) throw new Error('O valor não é um número válido.')
        else if(value > 1000000000000000)throw new Error('Quantidade muito alta, você provavelmente não tem todo esse dinheiro.')
    
        switch(currency){
            case 'dolar':
                params = "USD-BRL,USD-EUR,USD-JPY"
                break
            case 'euro':
                params = "EUR-BRL,EUR-USD,EUR-JPY"
                break
            case 'iene':
                params= "JPY-BRL,JPY-USD,JPY-EUR"
                break 
            case 'real':
                params= "BRL-USD,BRL-EUR,BRL-JPY"
                break                  
        }

        const {data : convertResponse} = await axios.get(URL_BASE+params).catch(() => {
            throw new Error('Houve um erro ao obter conversão de moeda, tente novamente mais tarde.')
        })

        let convertResult : CurrencyConvert = {
            value : value,
            currency: currency,
            convertion : []
        }

        for (let convertion in convertResponse){
            let currencyType = ''
            let currencySymbol = ''

            switch(convertResponse[convertion].codein){
                case "BRL":
                    currencyType = "Real"
                    currencySymbol = "R$"
                    break
                case "EUR":
                    currencyType = "Euro"
                    currencySymbol = "Є"
                    break
                case "USD":
                    currencyType = "Dólar"
                    currencySymbol = "$"
                    break
                case "JPY":
                    currencyType = "Iene"
                    currencySymbol = "¥"
                    break
            }

            let arrayDateUpdated = convertResponse[convertion].create_date.split(" ")[0].split("-")
            let hourUpdated = convertResponse[convertion].create_date.split(" ")[1]
            convertResult.convertion.push({
                currency: currencyType,
                convertion_name : convertResponse[convertion].name,
                value_converted : (convertResponse[convertion].bid * value).toFixed(2),
                value_converted_formatted : `${currencySymbol} ${(convertResponse[convertion].bid * value).toFixed(2)}`,
                updated: `${arrayDateUpdated[2]}/${arrayDateUpdated[1]}/${arrayDateUpdated[0]} às ${hourUpdated}`
            })
        }

        return convertResult
    } catch(err) {
        throw err
    }
}


export async function funnyRandomPhrases(){
    try {
        const URL_BASE = 'https://gist.githubusercontent.com/victorsouzaleal/bfbafb665a35436acc2310d51d754abb/raw/2be5f3b5333b2a9c97492888ed8e63b7c7675ae6/frases.json'
        const IMAGE_URL = 'https://i.imgur.com/pRSN2ml.png'

        let {data} = await axios.get(URL_BASE).catch(() => {
            throw new Error("Houve um erro ao obter a frase, tente novamente mais tarde.")
        })

        let responsePhrase = data.frases[Math.floor(Math.random() * data.frases.length)]
        let cont_params = 1

        if(responsePhrase.indexOf("{p3}") != -1) cont_params = 3
        else if(responsePhrase.indexOf("{p2}") != -1) cont_params = 2
    
        for(let i = 1; i <= cont_params; i++){
            let complementChosen = data.complementos[Math.floor(Math.random() * data.complementos.length)]
            responsePhrase = responsePhrase.replace(`{p${i}}`, `*${complementChosen}*`)
            data.complementos.splice(data.complementos.indexOf(complementChosen, 1))
        }

        const response = {
            image_url: IMAGE_URL,
            text: responsePhrase as string
        }

        return response
    } catch(err) {
        throw err
    }
}

export async function infoDDD(ddd: string){
    try {
        const URL_BASE = 'https://gist.githubusercontent.com/victorsouzaleal/ea89a42a9f912c988bbc12c1f3c2d110/raw/af37319b023503be780bb1b6a02c92bcba9e50cc/ddd.json'
        
        const {data : dddResponse} = await axios.get(URL_BASE).catch(() => {
            throw new Error("Houve um erro ao obter os dados do DDD, tente novamente mais tarde.")
        })

        const states = dddResponse.estados
        const indexDDD = states.findIndex((state : { ddd: string }) => state.ddd.includes(ddd))

        if(indexDDD === -1) throw new Error("Este DDD não foi encontrado, certifique-se que ele é válido.")
        
        const response = {
            state: states[indexDDD].nome,
            region: states[indexDDD].regiao
        }

        return response
    } catch(err) {
        throw err
    }
}

export async function symbolsASCI(){
    try {
        const URL_BASE = 'https://gist.githubusercontent.com/victorsouzaleal/9a58a572233167587e11683aa3544c8a/raw/aea5d03d251359b61771ec87cb513360d9721b8b/tabela.txt'
        
        const {data : symbolsResponse} = await axios.get(URL_BASE).catch(() => {
            throw new Error('Houve um erro ao obter a tabela de caracteres, tente novamente mais tarde.')
        })

        return symbolsResponse as string
    } catch(err) {
        throw err
    }
}

export function truthMachine(){
    try {
        const imageCalibration = 'https://i.imgur.com/kEWjkyP.png'
        const imagesResult = [
            'https://i.imgur.com/0N7hY1V.png',
            'https://i.imgur.com/3JG8Cu2.png',
            'https://i.imgur.com/44V8MHp.png',
            'https://i.imgur.com/fky7kQl.png',
            'https://i.imgur.com/M7gSj0p.png',
            'https://i.imgur.com/2IhKZFI.png',
            'https://i.imgur.com/mmX6cmR.png',
            'https://i.imgur.com/hy9oYoX.png'
        ]

        const randomIndex = Math.floor(Math.random() * imagesResult.length)
        const response = {
            calibration_url : imageCalibration,
            result_url : imagesResult[randomIndex]
        }

        return response
    } catch(err) {
        throw new Error("Houve um erro ao obter as imagens da máquina da verdade, tente novamente mais tarde.")
    }
}

export function flipCoin(){
    try {
        const coinSides = ['cara', 'coroa']
        const chosenSide = coinSides[Math.floor(Math.random() * coinSides.length)]
        const imageCoinUrl = chosenSide === 'cara' ? "https://i.imgur.com/E0jdBt1.png" : 'https://i.imgur.com/2uUDQab.png'
        const response = {
            chosen_side : chosenSide,
            image_coin_url : imageCoinUrl
        }
        
        return response
    } catch(err) {
        throw new Error("Houve um erro ao obter as imagem do lado da moeda, tente novamente mais tarde.")
    }
}



