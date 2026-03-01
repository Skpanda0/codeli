import { cancel , confirm , intro , isCancel , outro } from "@clack/prompts"
import { betterAuth, logger } from "better-auth"
import { createAuthClient } from "better-auth/client"
import { deviceAuthorizationClient } from "better-auth/client/plugins"
import { Command } from "commander"
import chalk from "chalk"
import fs from "node:fs/promises"
import open from "open"
import os from "os"
import path from "path"
import yoctoSpinner from "yocto-spinner"
import * as z from 'zod/v4'
import dotenv from "dotenv"
import prisma from "../../../lib/db.js"
import strict from "node:assert/strict"


dotenv.config()

const URL = "http://localhost:3005"
const CLIENT_ID = process.env.GITHUB_CLIENT_ID
const CONFIG_DIR = path.join(os.homedir(), ".better-auth")
const TOKEN_FILE = path.join(CONFIG_DIR, "token.json")


export async function loginAction(opts) {
    const options = z.object({
        serverUrl : z.string().optional(),
        clientId : z.string().optional()
    })

    const serverUrl = options.serverUrl || URL
    const clientId = options.clientId || CLIENT_ID

    intro(chalk.bold("🔒Auth CLI Login"))

    //TODO" Chnage this with token managemet utils
    const existingToken = false
    const expried = false

    if(existingToken && !expried){
        const shouldReAuth = await confirm({
            message : "You are already loggedIn. Do you want to login Again" , 
            initialValue:false
        })
        if(isCancel(shouldReAuth) || !shouldReAuth){
            cancel("Login Canceled")
            process.exit(0)
        }
    }

    const authClient = createAuthClient({
        baseURL : serverUrl,
        plugins : [deviceAuthorizationClient()]
    })

    const spinner = yoctoSpinner({
        text : "Requesting device authorization..."
    })
    spinner.start()

    try {
        const {data, error} = await authClient.device.code({
            client_id: clientId,
            scope:"openid profile email"
        })
        spinner.stop()

        if(error || !data){
            logger.error(`Failed to request device authroization : ${error.error_description}`)
            process.exit(1)
        }

        const {
            device_code ,
            user_code,
            verification_uri,
            verification_uri_complete,
            interval = 5,
            expires_in
        } = data;

        console.log(chalk.cyan("Device Authorization Requested"))

        console.log(`Please visit" ${chalk.underline.blue(verification_uri || verification_uri_complete)}`)

        console.log(`Enter Code: ${chalk.bold.green(user_code)}`)

        const shouldOpen = await confirm({
            message:"Open browser automatically",
            initialValue:true
        })

        if(!isCancel(shouldOpen) && shouldOpen){
            const urlToOpen = verification_uri || verification_uri_complete
            await open(urlToOpen)
        }

        console.log(chalk.gray(`Waiting for authorization (expires in ${Math.floor(expires_in / 60)} minutes...)`))

    } catch (error) {
        
    }

}

//cmd detup

export const login = new Command("login")
.description("Login to better-auth")
.option("--server-url <url>", "The Better Auth sever URL", URL)
.option("--client-id <id>", "The OAuth client ID", CLIENT_ID)
.action(loginAction)


