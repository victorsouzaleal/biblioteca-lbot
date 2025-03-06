import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'
import axios from 'axios'
import {getTempPath} from './util.js'

export async function convertMP4ToMP3 (videoBuffer: Buffer){
    try {
        const inputVideoPath = getTempPath('mp4')
        fs.writeFileSync(inputVideoPath, videoBuffer)
        const outputAudioPath = getTempPath('mp3')

        await new Promise <void> ((resolve, reject)=>{
            ffmpeg(inputVideoPath)
            .outputOptions(['-vn', '-codec:a libmp3lame', '-q:a 3'])
            .save(outputAudioPath)
            .on('end', () => resolve())
            .on("error", () => reject())
        }).catch(() =>{
            fs.unlinkSync(inputVideoPath)
            throw new Error("Houve um erro ao converter de MP4 para MP3, use outro vídeo ou tente novamente mais tarde.")
        })

        const audioBuffer = fs.readFileSync(outputAudioPath)
        fs.unlinkSync(inputVideoPath)
        fs.unlinkSync(outputAudioPath)

        return audioBuffer
    } catch(err){
        throw err
    }
}

export async function videoThumbnail(videoMedia : string | Buffer, type : "file"|"buffer"|"url"){
    try{
        let inputPath : string | undefined
        const outputThumbnailPath = getTempPath('jpg')

        if(type == "file"){
            if(typeof videoMedia !== 'string'){
                throw new Error('O tipo de operação está definido como FILE mas a mídia enviada não é um caminho de arquivo válido.')
            }

            inputPath = videoMedia
        } else if(type == "buffer"){
            if(!Buffer.isBuffer(videoMedia)) {
                throw new Error('O tipo de operação está definido como BUFFER mas a mídia enviada não é um buffer válido.')
            }

            inputPath = getTempPath('mp4')
            fs.writeFileSync(inputPath, videoMedia)
        } else if(type == "url"){
            if(typeof videoMedia !== 'string') {
                throw new Error('O tipo de operação está definido como URL mas a mídia enviada não é uma url válida.')
            }

            const responseUrlBuffer = await axios.get(videoMedia,  { responseType: 'arraybuffer' }).catch(()=>{
                throw new Error("Houve um erro ao fazer download da mídia para a thumbnail, tente novamente mais tarde.")
            })
            
            const bufferUrl = Buffer.from(responseUrlBuffer.data, "utf-8")
            inputPath = getTempPath('mp4')
            fs.writeFileSync(inputPath, bufferUrl)
        }

        await new Promise <void> (async (resolve, reject)=>{
            ffmpeg(inputPath)
            .addOption("-y")
            .inputOptions(["-ss 00:00:00"])
            .outputOptions(["-vf scale=32:-1", "-vframes 1", "-f image2"])
            .save(outputThumbnailPath)
            .on('end', () => resolve())
            .on('error', () => reject())
        }).catch(()=>{
            throw new Error("Houve um erro ao conversão a mídia para thumbnail, tente novamente mais tarde.")
        })

        if(type != 'file' && inputPath) {
            fs.unlinkSync(inputPath)
        }

        const thumbBase64 : Base64URLString = fs.readFileSync(outputThumbnailPath).toString('base64')
        fs.unlinkSync(outputThumbnailPath)

        return thumbBase64
    } catch(err){
        throw err
    }
  }