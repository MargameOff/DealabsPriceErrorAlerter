const axios = require('axios');
const fs = require("fs");
const puppeteer = require("puppeteer");
var _ = require('lodash');
const { EmbedBuilder, WebhookClient } = require('discord.js');

/*
Salut Dealabs, je suis disponible pour un stage ou une offre d'alternance !
N'hésitez pas à me contacter sur Discord : Margame#1234 
ou par mail : margames.tutorial@ŋmail.com
*/

//Local JSON file for data
let cookie = require("./cookie.json");
let saveData = require("./saveData.json");
const config = require("./config.json");
let response = new Object();

const forumCode = [1063390,1056379]
let urlFetch = [];

//Discord.js connexion
const webhookClient = new WebhookClient({ url: config.webhook });
const webhookError = new WebhookClient({ url: config.error_webhook });


async function refreshToken() {
    try {
        for (let i = 0; i < forumCode.length; i++) {
            let res = await getUrlToFetch(forumCode[i])
            //in res not in urlFetch push
            if (!urlFetch.includes(res) && res != undefined && res != null) {
                urlFetch.push(res)
            }
        }

        fs.writeFileSync("./cookie.json", JSON.stringify(urlFetch, null, 2));
        console.log("URL saved in ./cookie.json!");
    } catch (e) {
        console.log(e);
        process.exit(1);
    }

}

async function getUrlToFetch(id) {
    try {
        let browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        let page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36') // set user agent for emulate to the server the browser is using
        await page.goto("https://www.dealabs.com/"+id, {
            waitUntil: "networkidle0",
        });
        page.waitForSelector('span.btn.btn--mode-primary.overflow--wrap-on')
        await page.click('span.btn.btn--mode-primary.overflow--wrap-on', { delay: 500 });
        await page.click('span.btn.btn--mode-primary.overflow--wrap-on', { delay: 500 });
        await page.click('div.flex--inline.text--b.text--color-brandPrimary[data-t-change="ocular,ga"]', { delay: 500 });
        await page.click('div.flex--inline.text--b.text--color-brandPrimary[data-t-change="ocular,ga"]', { delay: 500 });
        let xhrCatcher = page.waitForResponse(r => r.request().url().includes('/10') && r.request().method() != 'OPTIONS');
        await page.click('[value="newest_first"]', { delay: 500 });
        console.log("Connected to Dealabs, Getting URL...");
        await delay(5000);
        let xhrResponse = await xhrCatcher;
        console.log("Got URL for Forum "+id+" !");
        await browser.close();
        return xhrResponse.request().url()
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
}

async function getNewData(index) {
    try {
        const urlI = urlFetch[index];
        const id = forumCode[index];
        //axios get request 
        let data = await axios.get(
            urlI,
            {
                headers: {
                    'authority': 'www.dealabs.com',
                    'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                    //'cookie': 'pepper_session=' + cookie.pepper_session + '; xsrf_t=' + cookie['httponly\nxsrf_t'] + ';',
                    'origin': 'https://www.dealabs.com',
                    'referer': 'https://www.dealabs.com/discussions/suivi-erreurs-de-prix-1063390',
                    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36',
                }
            }
        );
        response[id] = data;
        console.log("Data updated, waiting for next update ...");
    } catch (error) {
        console.log('Token are KO, try to get new one');
        process.exit(1);
    }
}

async function checkNewMessage(id) {
    let lastComment = response[id].data[0].data.comments.items[0]
    if (!saveData.lastMessageId[id].includes(lastComment.commentId)) {
        console.log("New message detected, sending notification");
        saveData.lastMessageId[id].push(lastComment.commentId);
        fs.writeFileSync("./saveData.json", JSON.stringify(saveData, null, 2));
        await sendNotification(lastComment, id);
    } else {
        console.log("No new message detected");
    }
}

async function sendNotification(comment, id) {
    let lienProduit, title;
    if (id ==1056379){
        title = 'Nouveau Post Erreur de prix !'
    } else {
        title = 'Nouveau Post Suivi d\'erreur de prix !'
    }
    let photo;
    if (comment.user.imageUrls == null) {
        photo = 'https://pbs.twimg.com/profile_images/1466421672404258820/VYhbnw79_400x400.png'
    } else {
        photo = 'https://static-pepper.dealabs.com'+comment.user.imageUrls['default.user_small_avatar']
    }
    console.log(photo);
    const embed = new EmbedBuilder()
    .setTitle(title)
    .addFields(
		{ name: 'De : '+ comment.user.username, value: comment.preparedHtmlContent.replace("<br />", "\n").replace(/<[^>]*>?/gm, '') },
	)
    .setColor(0x071ca1)
    .setURL(comment.url)
    .setThumbnail(photo)
    .setTimestamp();

    try {
        if(comment.preparedHtmlContent.match(/<a.*.a>/gm)){
        lienProduit = comment.preparedHtmlContent.match(/<a.*.a>/gm)[0].match(/title.*."/gm)[0].match(/(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/gm)[0].replace(/<[^>]*>?/gm, '')
        if (!lienProduit.includes("http")) {
            lienProduit = "https://" + lienProduit
        }
        embed.addFields({ name: 'Lien Produit : ', value: '['+lienProduit+']('+lienProduit+')' },)
    }
    } catch (error) {
        console.log('======ERROR======');
        await sendErrorNotification(error)
        process.exit(1);
    }    
    webhookClient.send({
        username: config.bot_name,
        avatarURL: config.bot_avatar,
        embeds: [embed],
    });
}

async function sendErrorNotification(error){
    const embed = new EmbedBuilder()
    .setTitle('Erreur')
    .addFields(
        { name: 'Erreur : ', value: error.toString() },
    )
    .setColor(0x071ca1)
    .setTimestamp();
    webhookError.send({
        username: config.bot_name,
        avatarURL: config.bot_avatar,
        embeds: [embed],
    });
}
//create main function for the program
async function main() {
    console.log("===========Dealabs Price Error Alert===========");
    console.log("Connecting to Dealabs for getting API token ...");
    await refreshToken();
    console.log("Getting data ...");
    while (true) {
        for (let index = 0; index < urlFetch.length; index++) {
            await getNewData(index);
            //console.log(await eval('response.'+forumCode[index]));
            await checkNewMessage(forumCode[index]);
            await delay(10000);
        }
    }
    /** 
    console.log(response);
    console.log("Le dernier message des Erreurs de prix date de " + response.data[0].data.comments.items[0].createdAt);
        console.log("Il a été posté par " + response.data[0].data.comments.items[0].user.username);
        console.log("Cette erreur de prix possède " + response.data[0].data.comments.items[0].replyCount + " réponse.s");
        
    //if(response.message){ }
    c*/
}
main();

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}
