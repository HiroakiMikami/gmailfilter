import * as google from "googleapis"
import { OAuth2Client } from "googleapis-common"
import * as readline from "readline"
import { FilterUtils } from "./utils"

const SCOPES = [
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.settings.basic",
    "https://www.googleapis.com/auth/gmail.modify"]

export interface ICredentials {
    installed: {
        client_secret: string,
        client_id: string,
        redirect_uris: string[],
    }
}
export interface ISetFiltersCallback {
    insert?: (filter: google.gmail_v1.Schema$Filter, index: number, length: number) => Promise<void>
    delete?: (filter: google.gmail_v1.Schema$Filter, index: number, length: number) => Promise<void>
}
export interface ICreateLabelsCallback {
    create?: (label: string, index: number, length: number) => Promise<void>
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
    public async getLabels() {
        const gmail = google.google.gmail({version: "v1", auth: this.oAuth2Client})
        const labels = await gmail.users.labels.list({ userId: "me" }).then((res) => {
            const m = new Map<string, string>()
            for (const label of res.data.labels) {
                m.set(label.name, label.id)
            }
            return m
        })
        return labels
    }
    public async createLabels(labels: string[], callback?: ICreateLabelsCallback) {
        const gmail = google.google.gmail({version: "v1", auth: this.oAuth2Client})
        let cnt = 0
        for (const label of labels) {
            await gmail.users.labels.create({
                requestBody: {
                    name: label
                },
                userId: "me"
            })
            if (callback && callback.create) {
                await callback.create(label, cnt, labels.length)
            }
            cnt += 1
        }
    }

    public async setFilters(
        filters: google.gmail_v1.Schema$Filter[],
        callback?: ISetFiltersCallback) {
        const gmail = google.google.gmail({version: "v1", auth: this.oAuth2Client})
        const currentFilters = new Set(await this.getFilters())

        /* create filters */
        let cnt = 0
        for (const filter of filters) {
            const filter2 = Array.from(currentFilters).find((f) => FilterUtils.equals(filter, f))
            if (filter2) {
                currentFilters.delete(filter2)
            } else {
                if (callback && callback.insert) {
                    await callback.insert(filter, cnt, filters.length)
                }
                await gmail.users.settings.filters.create({
                    requestBody: filter,
                    userId: "me",
                })
            }
            cnt += 1
        }

        /* delete all filters */
        cnt = 0
        for (const filter of Array.from(currentFilters)) {
            if (callback && callback.delete) {
                await callback.delete(filter, cnt, currentFilters.size)
            }
            await gmail.users.settings.filters.delete({ id: filter.id, userId: "me" })
            cnt += 1
        }
    }
    public async applyFilter(filter: google.gmail_v1.Schema$Filter) {
        const gmail = google.google.gmail({version: "v1", auth: this.oAuth2Client})
        const messages = await gmail.users.messages.list({
            userId: "me",
            q: filter.criteria.query
        })
        const ids = (messages.data.messages || []).map(x => x.id)
        for (let i = 0; i < ids.length; i += 1000) {
            await gmail.users.messages.batchModify({
                requestBody: {
                    addLabelIds: filter.action.addLabelIds,
                    ids: ids.slice(i, Math.min(i + 1000, ids.length)),
                    removeLabelIds: filter.action.removeLabelIds
                },
                userId: "me"
            })
        }
        return
    }

    public async getFilters() {
        const gmail = google.google.gmail({version: "v1", auth: this.oAuth2Client})
        const filters: google.gmail_v1.Schema$Filter[] =
            (await gmail.users.settings.filters.list({ userId: "me"})).data.filter

        return filters || []
    }

    public getToken(): string {
        return JSON.stringify(this.tokens || "")
    }
}
