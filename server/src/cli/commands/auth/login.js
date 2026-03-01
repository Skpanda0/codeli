import { cancel, confirm, intro, isCancel, outro } from "@clack/prompts"
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
import { clearStoredToken, getStoredToken, isTokenExpired, requireAuth, storeToken } from "../../../lib/token.js"
import { CONFIG_DIR, TOKEN_FILE } from "../../../lib/token.js"

dotenv.config()

const URL = "http://localhost:3005"
const CLIENT_ID = process.env.GITHUB_CLIENT_ID
// export const CONFIG_DIR = path.join(os.homedir(), ".better-auth")
// export const TOKEN_FILE = path.join(CONFIG_DIR, "token.json")

//Token magement


export async function loginAction(opts) {
    const options = z.object({
        serverUrl: z.string().optional(),
        clientId: z.string().optional()
    })

    const serverUrl = options.serverUrl || URL
    const clientId = options.clientId || CLIENT_ID

    intro(chalk.bold("🔒Auth CLI Login"))

    //TODO" Chnage this with token managemet utils
    const existingToken = await getStoredToken()
    const expried =  await isTokenExpired()

    if (existingToken && !expried) {
        const shouldReAuth = await confirm({
            message: "You are already loggedIn. Do you want to login Again",
            initialValue: false
        })
        if (isCancel(shouldReAuth) || !shouldReAuth) {
            cancel("Login Canceled")
            process.exit(0)
        }
    }

    const authClient = createAuthClient({
        baseURL: serverUrl,
        plugins: [deviceAuthorizationClient()]
    })

    const spinner = yoctoSpinner({
        text: "Requesting device authorization..."
    })
    spinner.start()

    try {
        const { data, error } = await authClient.device.code({
            client_id: clientId,
            scope: "openid profile email"
        })
        spinner.stop()

        if (error || !data) {
            logger.error(`Failed to request device authroization : ${error.error_description}`)
            process.exit(1)
        }

        const {
            device_code,
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
            message: "Open browser automatically",
            initialValue: true
        })

        if (!isCancel(shouldOpen) && shouldOpen) {
            const urlToOpen = verification_uri_complete || verification_uri
            await open(urlToOpen)
        }

        console.log(chalk.gray(`Waiting for authorization (expires in ${Math.floor(expires_in / 60)} minutes...)`))

        const token = await pollForToken(
            authClient,
            device_code,
            clientId,
            interval
        )

        if(token){
            const saved = await storeToken(token)
            if(!saved){
                console.log(chalk.yellow("\n ⚠️ Warning: Could not save authentication token."))
                console.log(chalk.yellow("You may need to login again on next use."))
            }
        }

        //Todo: get user data


        outro(chalk.green("Login sucessfull"))
        console.log(chalk.gray(`\n Token saved to: ${TOKEN_FILE} `))
        console.log(chalk.gray(`You can now use AI commands without logging in again.\n`))

    } catch (error) {
        spinner.stop()
        console.error(chalk.red("\nLogin failed"), error.message)
        process.exit(1)
    }

}

async function pollForToken(authClient, deviceCode, clientId, initialIterval) {
    let pollingInterval = initialIterval
    const spinner = yoctoSpinner({ text: "", color: "cyan" })
    let dots = 0

    return new Promise((resolve, reject) => {
        const poll = async () => {
            dots = (dots + 1) % 4
            spinner.text = chalk.gray(`Polling for authorization${".".repeat(dots)}${" ".repeat(3 - dots)}`)
            if (!spinner.isSpinning) spinner.start();
            try {
                const { data, error } = await authClient.device.token({
                    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                    device_code: deviceCode,
                    client_id: clientId,
                    fetchOption: {
                        "user-agent": `My CLI`,
                    }
                })
                if (data?.access_token) {
                    console.log(chalk.yellow(`Your access token: ${data.access_token}`))
                    spinner.stop()
                    resolve(data)
                    return
                } else if (error) {
                    switch (error.error) {
                        case "authorization_pending":
                            // Continue polling silently
                            break;
                        case "slow_down":
                            pollingInterval += 5;
                            console.log(`⚠️  Slowing down polling to ${pollingInterval}s`);
                            break;
                        case "access_denied":
                            console.error("❌ Access was denied by the user");
                            process.exit(1);
                            break;
                        case "expired_token":
                            console.error("❌ The device code has expired. Please try again.");
                            process.exit(1);
                            break;
                        default:
                            spinner.stop()
                            logger.error(`Error: ${error.error_description}`)
                            // console.error("❌ Error:", error.error_description);
                            process.exit(1);
                    }
                }
            } catch (error) {
                spinner.stop()
                logger.error(`Network error: ${error.message}`)
                process.exit(1)
            }
            setTimeout(poll, pollingInterval * 1000)
        }
        setTimeout(poll, pollingInterval * 1000)
    })
}

export async function logoutAction() {
  intro(chalk.bold("👋 Logout"));

  const token = await getStoredToken();

  if (!token) {
    console.log(chalk.yellow("You're not logged in."));
    process.exit(0);
  }

  const shouldLogout = await confirm({
    message: "Are you sure you want to logout?",
    initialValue: false,
  });

  if (isCancel(shouldLogout) || !shouldLogout) {
    cancel("Logout cancelled");
    process.exit(0);
  }

  const cleared = await clearStoredToken();

  if (cleared) {
    outro(chalk.green("✅ Successfully logged out!"));
  } else {
    console.log(chalk.yellow("⚠️  Could not clear token file."));
  }
}

export async function whoamiAction(opts) {
  const token = await requireAuth();
  if (!token?.access_token) {
    console.log("No access token found. Please login.");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        some: {
          token: token.access_token,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });

  // Output user session info
  console.log(
    chalk.bold.greenBright(`\n👤 User: ${user.name}
📧 Email: ${user.email}
👤 ID: ${user.id}`)
  );
}

//cmd setup

export const login = new Command("login")
    .description("Login to better-auth")
    .option("--server-url <url>", "The Better Auth sever URL", URL)
    .option("--client-id <id>", "The OAuth client ID", CLIENT_ID)
    .action(loginAction)

export const logout = new Command("logout")
  .description("Logout and clear stored credentials")
  .action(logoutAction);

export const whoami = new Command("whoami")
  .description("Show current authenticated user")
  .option("--server-url <url>", "The Better Auth server URL", URL)
  .action(whoamiAction);
