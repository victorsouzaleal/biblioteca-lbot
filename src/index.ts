import ffmpeg from "fluent-ffmpeg"
import('@ffmpeg-installer/ffmpeg').then((ffmpegInstaller)=>{
    ffmpeg.setFfmpegPath(ffmpegInstaller.path)
}).catch(()=>{})

import * as audioLibrary from './libraries/audio.library.js'
import * as downloadLibrary from './libraries/download.library.js'
import * as utilityLibrary from './libraries/utility.library.js'
import * as miscLibrary from './libraries/misc.library.js'
import * as imageLibrary from './libraries/image.library.js'
import * as convertLibrary from './libraries/convert.library.js'
import * as stickerLibrary from './libraries/sticker.library.js'
import * as aiLibrary from './libraries/ai.library.js'
import * as updaterLibrary from './libraries/updater.library.js'

export  { 
    audioLibrary,
    downloadLibrary,
    utilityLibrary,
    miscLibrary,
    imageLibrary,
    convertLibrary,
    stickerLibrary,
    aiLibrary,
    updaterLibrary
}