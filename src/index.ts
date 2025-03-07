import ffmpeg from "fluent-ffmpeg"
import('@ffmpeg-installer/ffmpeg').then((ffmpegInstaller)=>{
    ffmpeg.setFfmpegPath(ffmpegInstaller.path)
}).catch(()=>{})

import * as audioLibrary from './lib/audio.js'
import * as downloadLibrary from './lib/download.js'
import * as generalLibrary from './lib/general.js'
import * as imageLibrary from './lib/image.js'
import * as convertLibrary from './lib/convert.js'
import * as stickerLibrary from './lib/sticker.js'

export {audioLibrary, downloadLibrary, generalLibrary, imageLibrary, convertLibrary, stickerLibrary}