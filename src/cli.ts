import * as commander from "commander"
import * as fs from "fs"
import * as google from "googleapis"
import { evaluate, Filter } from "./dsl"
import { GmailClient } from "./gmail"

const prefix = `
const $ = require("./dsl_syntax")
const Around = $.Around
const Match = $.Match
const If = $.If
const Mail = $.Mail
const Not = $.Not
const And = $.And
const Or = $.Or
const K = $.K
const to = $.to
const from = $.from
const subject = $.subject
const cc = $.cc
const bcc = $.bcc
const list = $.list
const deliveredto = $.deliveredto
const Rfc822msgid = $.Rfc822msgid;

`

async function main() {
    commander
        .option("--credential-path <path>", "The path of the credential file")
        .option("--token-path <path>", "The path of the token file")
        .option("--backup <path>", "Create backup of filters before updating")
        .option("--dryrun")
        .option("--create-label")
        .option("--filter <path>", "The filter JavaScript file")
        .parse(process.argv)

    console.log(`Loading credentials from ${commander.credentialPath}`)
    const credentials = JSON.parse(await new Promise((resolve, reject) => {
        fs.readFile(commander.credentialPath, "utf8", (err, data) => {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        })
    }))
    let tokens = null
    if (commander.tokenPath) {
        console.log(`Loading tokens from ${commander.tokenPath}`)
        tokens = JSON.parse(await new Promise((resolve) => {
            fs.readFile(commander.tokenPath, "utf8", (err, data) => {
                if (err) {
                    resolve(null)
                } else {
                    resolve(data)
                }
            })
        }))
    }

    const client = new GmailClient(credentials, tokens)
    await client.authorize()

    if (commander.tokenPath) {
        console.log(`Saving tokens to ${commander.tokenPath}`)
        await new Promise((resolve, reject) => {
            fs.writeFile(commander.tokenPath, client.getToken(), (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }

    if (!commander.dryrun && commander.backup) {
        console.log(`Create a backup of filters to ${commander.backup}`)
        const currentFilters = await client.getFilters()
        await new Promise((resolve, reject) => {
            fs.writeFile(commander.backup, JSON.stringify(currentFilters), (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }

    console.log(`Loading the configurations of filters from ${commander.filter}`)
    const filterConfigStr: string = await new Promise((resolve, reject) => {
        fs.readFile(commander.filter, "utf8", (err, data) => {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        })
    })
    const filterConfigs: Filter[] = eval(prefix + filterConfigStr)
    const filters: google.gmail_v1.Schema$Filter[] = [].concat.apply([], filterConfigs.map(evaluate))

    if (commander.createLabel && !commander.dryrun) {
        console.log(`Creating the labels`)
        const labels = await client.getLabels()
        let neededLabels = new Set<string>()
        for (const filter of filters) {
            if (filter.action.addLabelIds) {
                for (const label of filter.action.addLabelIds) {
                    if (!labels.has(label)) {
                        neededLabels.add(label)
                    }
                }
            }
            if (filter.action.removeLabelIds) {
                for (const label of filter.action.removeLabelIds) {
                    if (!labels.has(label)) {
                        neededLabels.add(label)
                    }
                }
            }
        }
        await client.createLabels(
            Array.from(neededLabels),
            {
                create: async (label, index, length) => {
                    console.log(`Creating ${index + 1} of ${length} label (${label})`)
                    return
                }
            })
    }

    console.log(`Converting the label names to label ids`)
    const labels = await client.getLabels()
    for (const filter of filters) {
        let action: google.gmail_v1.Schema$FilterAction = {}
        if (filter.action.forward) {
            action.forward = action.forward
        }
        if (filter.action.addLabelIds) {
            action.addLabelIds = filter.action.addLabelIds.map((label) => {
                return labels.get(label)
            })
        }
        if (filter.action.removeLabelIds) {
            action.removeLabelIds = filter.action.removeLabelIds.map((label) => {
                return labels.get(label)
            })
        }
        filter.action = action
    }

    if (commander.dryrun) {
        for (const filter of filters) {
            console.log(filter)
        }
    } else {
        console.log(`Updating filters`)
        await client.setFilters(
            filters,
            {
                insert: async (_, i, length) => {
                    console.log(`Creating ${i + 1} of ${length} filter`)
                    return
                },
                delete: async (_, i, length) => {
                    console.log(`Deleting ${i + 1} of ${length} filter`)
                    return
                },
            })
    }
}

main().catch(console.error)
