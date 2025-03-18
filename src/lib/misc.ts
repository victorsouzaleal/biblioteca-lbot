import axios from "axios"
import fs from 'fs-extra'
import AdmZip from 'adm-zip'

export async function checkUpdate(currentBotVersion : string){
    try {
        const [currentMajor, currentMinor, currentPatch] = currentBotVersion.split(".")
        const {data} = await axios.get('https://api.github.com/repos/victorsouzaleal/lbot-whatsapp/releases/latest', {responseType: 'json'})
        const remoteVersion = data.tag_name
        const [remoteMajor, remoteMinor, remotePatch] = remoteVersion.split(".")
        let response = {
            latest : true,
            patch_update: false,
        }

        if(Number(currentMajor) == Number(remoteMajor) && Number(currentMinor) == Number(remoteMinor) && Number(currentPatch) < Number(remotePatch)){
            response.latest = false
            response.patch_update = true
        } 
        
        if (Number(currentMajor) < Number(remoteMajor) || (Number(currentMajor) == Number(remoteMajor) && Number(currentMinor) < Number(remoteMinor))){
            response.latest = false
            response.patch_update = false
        }

        return response
    } catch (err){
        throw err
    }
}

export async function makeUpdate(path: string = './'){
    try {
        const {data} = await axios.get('https://api.github.com/repos/victorsouzaleal/lbot-whatsapp/releases/latest', {responseType: 'json'})
        const assetUrl = data.assets[0].browser_download_url
        const {data : remoteVersion} = await axios.get(assetUrl, {responseType: 'arraybuffer'})
        const zipBuffer = Buffer.from(remoteVersion, 'utf-8')
        const zip = new AdmZip(zipBuffer)
        zip.extractAllToAsync(path, true, true)
    } catch(err){
        throw err
    }
}