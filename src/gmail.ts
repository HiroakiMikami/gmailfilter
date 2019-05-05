import * as google from "googleapis"
import { OAuth2Client } from "googleapis-common"
import * as readline from "readline"

const SCOPES = ["https://www.googleapis.com/auth/gmail.labels", "https://www.googleapis.com/auth/gmail.settings.basic"]

export interface ICredentials {
    installed: {
        client_secret: string,
        client_id: string,
        redirect_uris: string[],
    }
}

export class GmailClient {
    private oAuth2Client: OAuth2Client
    constructor(private credentials: ICredentials, private tokens: any | null) {}
    public async authorize() {
        /* Reference: https://developers.google.com/gmail/api/quickstart/nodejs */
        const {client_secret, client_id, redirect_uris} = this.credentials.installed
        this.oAuth2Client = new google.google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
        if (!this.tokens) {
            // Get new token
            const authUrl = this.oAuth2Client.generateAuthUrl({ access_type: "offline", scope: SCOPES })
            console.log("Authorize this app by visiting this url:", authUrl)
            const rl = readline.createInterface({
                input: process.stdin, output: process.stdout,
            })
            const code = await new Promise<string>((resolve) => {
                rl.question("Enter the code from that page here: ", (c: string) => resolve(c))
            })
            rl.close()
            this.tokens = await new Promise<any>((resolve: (value: any) => void, reject: (value: any) => void) => {
                this.oAuth2Client.getToken(code, (err, token) => {
                    if (err) { reject(err) } else { resolve(token) }
                })
            })
        }

        this.oAuth2Client.setCredentials(this.tokens)
    }

    public async setFilters(filters: google.gmail_v1.Schema$Filter[]) {
        const gmail = google.google.gmail({version: "v1", auth: this.oAuth2Client})
        const currentFilters = await this.getFilters()

        /* delete all filters */
        let cnt = 0
        for (const filter of currentFilters) {
            cnt += 1
            console.log(`Deleting ${cnt} of ${currentFilters.length} filters`)
            await gmail.users.settings.filters.delete({ id: filter.id, userId: "me" })
        }

        /* create filters */
        cnt = 0
        for (const filter of filters) {
            cnt += 1
            console.log(`Creating ${cnt} of ${filters.length} filters`)
            gmail.users.settings.filters.create({
                requestBody: filter,
                userId: "me",
            })
        }
    }

    public async getFilters() {
        const gmail = google.google.gmail({version: "v1", auth: this.oAuth2Client})
        const filters: google.gmail_v1.Schema$Filter[] = await new Promise((resolve, reject) => {
            gmail.users.settings.filters.list(
                { userId: "me"},
                (err, res) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(res.data.filter)
                    }
                },
            )
        })

        return filters
    }

    public getToken(): string {
        return JSON.stringify(this.tokens || "")
    }
}
