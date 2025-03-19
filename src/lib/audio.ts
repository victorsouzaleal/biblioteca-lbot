import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'
import {getTempPath} from './util.js'
import { convertMp4ToMp3 } from './convert.js'
import duration from 'format-duration-time'
import {createClient} from '@deepgram/sdk'
import tts from 'node-gtts'
import {fileTypeFromBuffer, FileTypeResult} from 'file-type'
import axios, { AxiosRequestConfig } from 'axios'
import FormData from 'form-data'
import { AudioModificationType, MusicRecognition } from './interfaces.js'


export async function textToVoice (lang: "pt" | 'en' | 'ja' | 'es' | 'it' | 'ru' | 'ko' | 'sv', text: string){
    try {
        const audioPath = getTempPath("mp3")

        await new Promise <void>((resolve) =>{
            tts(lang).save(audioPath, text, ()=> resolve())
        }).catch(() => { 
            throw new Error("Houve um erro ao converter texto para voz, tente novamente mais tarde.")
        })

        const audioBuffer = fs.readFileSync(audioPath)
        fs.unlinkSync(audioPath)

        return audioBuffer
    } catch(err){
        throw err
    }
}

export async function audioTranscription (audioBuffer : Buffer, {deepgram_secret_key} : {deepgram_secret_key : string}){
    try {
        const deepgram = createClient(deepgram_secret_key)
        const deepgramConfig = {
            model: 'nova-2',
            language: 'pt-BR',
            smart_format: true, 
        }

        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, deepgramConfig).catch(()=>{
            throw new Error("Houve um erro ao obter a transcrição do áudio, use outro aúdio ou tente novamente mais tarde.")
        })
        
        if(error) throw new Error("Houve um erro ao obter a transcrição do áudio, use outro aúdio ou tente novamente mais tarde.")

        return result.results.channels[0].alternatives[0].transcript
    } catch(err){
        throw err
    }
}

export async function audioModified (audioBuffer: Buffer, type: AudioModificationType){
    try {
        const inputAudioPath = getTempPath('mp3')
        const outputAudioPath = getTempPath('mp3')
        let options : string[] = []
        fs.writeFileSync(inputAudioPath, audioBuffer)

        switch(type){
            case "estourar":
                options = ["-y", "-filter_complex", "acrusher=level_in=3:level_out=5:bits=10:mode=log:aa=1"] 
                break
            case "reverso":
                options = ["-y", "-filter_complex", "areverse"]
                break
            case "grave":
                options = ["-y", "-af", "asetrate=44100*0.8"]
                break
            case "agudo":
                options = ["-y", "-af", "asetrate=44100*1.4"]
                break
            case "x2":
                options = ["-y", "-filter:a", "atempo=2.0", "-vn"]
                break
            case "volume":
                options = ["-y", "-filter:a", "volume=4.0"]
                break
            default:
                fs.unlinkSync(inputAudioPath)
                throw new Error(`Esse tipo de edição não é suportado`)
        }
        
        await new Promise <void>((resolve, reject) => {
            ffmpeg(inputAudioPath)
            .outputOptions(options)
            .save(outputAudioPath)
            .on('end', () => resolve())
            .on("error", () => reject())
        }).catch(()=>{
            fs.unlinkSync(inputAudioPath)
            throw new Error("Houve um erro de conversão no FFMPEG ao obter o áudio modificado, tente usar outro áudio.")
        })

        const bufferModifiedAudio = fs.readFileSync(outputAudioPath)
        fs.unlinkSync(inputAudioPath)
        fs.unlinkSync(outputAudioPath)
        
        return bufferModifiedAudio
    } catch(err){
        throw err
    }
}

export async function musicRecognition (mediaBuffer : Buffer, {acr_host , acr_access_key, acr_access_secret}: {acr_host: string, acr_access_key: string, acr_access_secret: string}){
    try {
        const URL_BASE = 'https://identify-eu-west-1.acrcloud.com/v1/identify'
        const {mime} = await fileTypeFromBuffer(mediaBuffer) as FileTypeResult
        let audioBuffer : Buffer | undefined

        if(!mime.startsWith('video') && !mime.startsWith('audio')) throw new Error('Esse tipo de arquivo não é suportado.')
        if(mime.startsWith('video')) audioBuffer = await convertMp4ToMp3('buffer', mediaBuffer)
        else audioBuffer = mediaBuffer

        const formData = new FormData()
        formData.append('host', acr_host?.trim())
        formData.append('access_key', acr_access_key?.trim())
        formData.append('access_secret', acr_access_secret?.trim())
        formData.append('data_type', 'fingerprint')
        formData.append('sample', audioBuffer, {filename: 'audio.mp3'})
        const config : AxiosRequestConfig = {
            url: URL_BASE,
            method: 'POST',
            data: formData
        }

        const { data : recognitionResponse} = await axios.request(config).catch(() => {
            throw new Error('Houve um erro ao obter o reconhecimento de música, tente novamente mais tarde.')
        })

        if(recognitionResponse.status.code == 1001) throw new Error('Não foi encontrada uma música compatível.')
        else if(recognitionResponse.status.code == 3003 || recognitionResponse.status.code == 3015) throw new Error("Você excedeu o limite do ACRCloud, crie uma nova chave no site")
        else if (recognitionResponse.status.code == 3000) throw new Error('Houve um erro no servidor do ACRCloud, tente novamente mais tarde')

        let arrayReleaseDate = recognitionResponse.metadata.music[0].release_date.split("-")
        let artists : string[] = []

        for(let artist of recognitionResponse.metadata.music[0].artists) artists.push(artist.name)

        const musicRecognition : MusicRecognition = {
            producer : recognitionResponse.metadata.music[0].label || "-----",
            duration: duration.default(recognitionResponse.metadata.music[0].duration_ms).format("m:ss"),
            release_date: `${arrayReleaseDate[2]}/${arrayReleaseDate[1]}/${arrayReleaseDate[0]}`,
            album: recognitionResponse.metadata.music[0].album.name,
            title: recognitionResponse.metadata.music[0].title,
            artists: artists.toString()
        }
        
        return musicRecognition
    } catch(err){
        throw err
    }
}

