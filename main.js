const axios = require('axios');
const fs = require("fs");
const puppeteer = require("puppeteer");
const { EmbedBuilder, WebhookClient } = require('discord.js');

//Local JSON file for data
let cookie = require("./cookie.json");
let saveData = require("./saveData.json");
const config = require("./config.json");
let response = new Object();

const forumCode = [1063390,1056379]

//Discord.js connexion
const webhookClient = new WebhookClient({ url: config.webhook });


async function refreshToken() {
    try {
        let browser = await puppeteer.launch({ headless: true });
        let page = await browser.newPage();
        const result = []
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36') // set user agent for emulate to the server the browser is using
        await page.goto("https://www.dealabs.com/discussions/suivi-erreurs-de-prix-1063390", {
            waitUntil: "networkidle0",
        });
        page.waitForSelector('span.btn.btn--mode-primary.overflow--wrap-on')
        await page.click('span.btn.btn--mode-primary.overflow--wrap-on', { delay: 300 });
        await page.click('span.btn.btn--mode-primary.overflow--wrap-on', { delay: 300 });
        await page.click('div.flex--inline.text--b.text--color-brandPrimary[data-t-change="ocular,ga"]', { delay: 300 });
        await page.click('div.flex--inline.text--b.text--color-brandPrimary[data-t-change="ocular,ga"]', { delay: 300 });
        let xhrCatcher = page.waitForResponse(r => r.request().url().includes('graphql') && r.request().method() != 'OPTIONS');
        await page.click('[value="newest_first"]', { delay: 300 });
        console.log("Connected to Dealabs, Getting Token...");
        await delay(5000);
        let xhrResponse = await xhrCatcher;
        let xhrPayload = await xhrResponse.headers()['set-cookie'];
        const list = {};
        xhrPayload.split(`;`).forEach(function (cookie) {
            let [name, ...rest] = cookie.split(`=`);
            name = name?.trim();
            if (!name) return;
            const value = rest.join(`=`).trim();
            if (!value) return;
            list[name] = decodeURIComponent(value);
        });
        fs.writeFileSync("./cookie.json", JSON.stringify(list, null, 2));
        console.log("Got Token and saved in ./cookie.json!");
        await browser.close();
        cookie = list;
    } catch (e) {

        console.log(e);

    }

}

async function getNewData(id) {
    try {
        let data = await axios.post(
            'https://www.dealabs.com/graphql',
            [
                {
                    'query': 'query comments($filter: CommentFilter!, $limit: Int, $page: Int, $repliesPreview: Boolean = false) {  comments(filter: $filter, limit: $limit, page: $page) {    items {      ...commentFields      replyCount @include(if: $repliesPreview)      repliesPreview @include(if: $repliesPreview) {        ...commentFields      }    }    pagination {      ...paginationFields    }  }}        fragment commentFields on Comment {  commentId  mainCommentId  threadId  url  preparedHtmlContent  user {    ...userMediumAvatarFields    ...userNameFields    ...userPersonaFields    bestBadge {      ...badgeFields    }  }  reactionCounts {    type    count  }  deletable  currentUserReaction {    type  }  wasEdited  reported  reportable  source  status  createdAt  updatedAt  ignored  popular  isPinned  deletedBy {    username  }  notes {    content    createdAt    user {      username    }  }  parentReply {    commentId    isReply    user {      ...userNameFields    }  }  isReply}        fragment userMediumAvatarFields on User {  userId  isDeletedOrPendingDeletion  imageUrls(slot: "default", variations: ["user_small_avatar"])}        fragment userNameFields on User {  userId  username  isUserProfileHidden  isDeletedOrPendingDeletion}        fragment userPersonaFields on User {  persona {    type    text  }}        fragment badgeFields on Badge {  badgeId  level {    ...badgeLevelFields  }}        fragment badgeLevelFields on BadgeLevel {  key  name  description}        fragment paginationFields on Pagination {  count  current  last  next  previous  size  order  orderBy}',
                    'variables': {
                        'filter': {
                            'threadId': {
                                'eq': id
                            }
                        },
                        'page': 1,
                        'repliesPreview': true
                    }
                },
                {
                    'query': 'query commentSettings($scope: ID!, $comments: Boolean = false, $form: Boolean = false, $adminTools: Boolean = false) {  features {    commentForm(scope: $scope) {      ...commentFeatures @include(if: $comments)      ...commentFormFeatures @include(if: $form)    }    adminTools(scope: "comment") @include(if: $adminTools) {      ...commentAdminFeatures    }  }  settings {    application {      appStore @include(if: $comments)      reCaptcha2Key: reCaptcha(version: 1) @include(if: $form)    }  }}        fragment commentFeatures on CommentFormFeatures {  permalink  issueReporting}        fragment commentFormFeatures on CommentFormFeatures {  enabled  subscribe  reCaptcha  wysiwyg {    html    expand    bold    italic    strike    blockquote  }}        fragment commentAdminFeatures on AdminToolFeatures {  deletable  demoteComment  directMessage  editable  enabled  expanded  imposeInfractions  inspectUser  moderate  promoteComment  seeDeleted  showCountry  spamReport}',
                    'variables': {
                        'scope': id,
                        'comments': true,
                        'form': true,
                        'adminTools': true
                    }
                },
                {
                    'query': 'query newComments($scope: ID!, $limit: Int) {  newComments(threadId: $scope, limit: $limit) {    page    count    latest  }}',
                    'variables': {
                        'scope': id
                    }
                },
                {
                    'query': 'query currentUserAvatar($variations: [String!]!) {  me {    userId    imageUrls(slot: "default", variations: $variations)  }}',
                    'variables': {
                        'variations': [
                            'user_small_avatar'
                        ]
                    }
                },
                {
                    'query': 'query commentsPinned($pinnedCommentsFilter: CommentFilter!, $repliesPreview: Boolean = false) {  commentsPinned: comments(filter: $pinnedCommentsFilter) {    items {      ...commentFields      replyCount @include(if: $repliesPreview)      repliesPreview @include(if: $repliesPreview) {        ...commentFields      }    }  }}        fragment commentFields on Comment {  commentId  mainCommentId  threadId  url  preparedHtmlContent  user {    ...userMediumAvatarFields    ...userNameFields    ...userPersonaFields    bestBadge {      ...badgeFields    }  }  reactionCounts {    type    count  }  deletable  currentUserReaction {    type  }  wasEdited  reported  reportable  source  status  createdAt  updatedAt  ignored  popular  isPinned  deletedBy {    username  }  notes {    content    createdAt    user {      username    }  }  parentReply {    commentId    isReply    user {      ...userNameFields    }  }  isReply}        fragment userMediumAvatarFields on User {  userId  isDeletedOrPendingDeletion  imageUrls(slot: "default", variations: ["user_small_avatar"])}        fragment userNameFields on User {  userId  username  isUserProfileHidden  isDeletedOrPendingDeletion}        fragment userPersonaFields on User {  persona {    type    text  }}        fragment badgeFields on Badge {  badgeId  level {    ...badgeLevelFields  }}        fragment badgeLevelFields on BadgeLevel {  key  name  description}',
                    'variables': {
                        'pinnedCommentsFilter': {
                            'threadId': {
                                'eq': id
                            },
                            'pinnedOnly': {
                                'is': true
                            }
                        },
                        'repliesPreview': true
                    }
                },
                {
                    'query': 'query additionalInfo($threadId: ID!) {  thread(threadId: {eq: $threadId}) {    additionalInfo {      additionalInfoId: threadAdditionalInfoId      deletedBy {        userId        username      }      deletable      editable      liked      likeCount    }  }}',
                    'variables': {
                        'threadId': id
                    }
                },
                {
                    'query': 'query internalLinkingThread($linkingLimit: Int, $threadId: ID!, $userImageSlot: String!, $userImageVariations: [String!]!) {  thread(threadId: {eq: $threadId}) {    relatedMerchants(limit: $linkingLimit) {      merchantId      merchantUrlName      merchantName      merchantNameWithSeoTerm    }    relatedGroups(limit: $linkingLimit) {      threadGroupId      threadGroupName      threadGroupUrlName    }    relatedDiscussions(limit: $linkingLimit) {      threadId      threadTypeId      title      titleSlug      url      commentCount      user {        userId        username        imageUrls(slot: $userImageSlot, variations: $userImageVariations)      }    }  }}',
                    'variables': {
                        'linkingLimit': 15,
                        'threadId': id,
                        'userImageSlot': 'default',
                        'userImageVariations': [
                            'user_small_listing_avatar'
                        ]
                    }
                },
                {
                    'query': 'query appDownloadMessageSettings {  settings {    appDownloadMessage {      isEnabled      isUserEligible      minimumClickOutsForNextShowing      maximumShowingsPerDay      appRating      isEnabledForThreadVoting      minimumThreadVotesForFirstShowing      minimumThreadVotesForNextShowing    }  }}'
                },
                {
                    'query': 'query HotJarQuery {  settings {    hotJar {      id    }  }  features {    hotJar  }}'
                },
                {
                    'query': 'query CookiePolicy {  features {    cookiePolicy {      allowTracking    }  }}'
                }
            ],
            {
                headers: {
                    'authority': 'www.dealabs.com',
                    'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                    'cookie': 'pepper_session=' + cookie.pepper_session + '; xsrf_t=' + cookie['httponly\nxsrf_t'] + ';',
                    'origin': 'https://www.dealabs.com',
                    'referer': 'https://www.dealabs.com/discussions/suivi-erreurs-de-prix-1063390',
                    'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="101", "Google Chrome";v="101"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Linux"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36',
                    'x-pepper-txn': 'threads.show',
                    'x-request-type': 'application/vnd.pepper.v1+json',
                    'x-requested-with': 'XMLHttpRequest',
                    'x-xsrf-token': '"WKetYHMCO80CUA9n1UC1DEYGVxZlZnDqucj1J18V"'
                }
            }
        );
        response[id] = data;
        console.log("Data updated, waiting for next update ...");
    } catch (error) {
        console.log(error);
        console.log('Token are KO, try to get new one');
        await refreshToken();
        getNewData()
    }
}

async function checkNewMessage(id) {
    let lastComment = response[id].data[0].data.comments.items[0]
    if (lastComment.commentId != saveData.lastMessageId[id]) {
        console.log("New message detected, sending notification");
        saveData.lastMessageId[id] = lastComment.commentId;
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
    const embed = new EmbedBuilder()
    .setTitle(title)
    .addFields(
		{ name: 'De : '+ comment.user.username, value: comment.preparedHtmlContent.replace("<br />", "\n").replace(/<[^>]*>?/gm, '') },
	)
    .setColor(0x071ca1)
    .setURL(comment.url)
    .setThumbnail('https://static-pepper.dealabs.com'+comment.user.imageUrls['default.user_small_avatar'])
    .setTimestamp();

    if(comment.preparedHtmlContent.match(/<a.*.a>/gm)[0]){
        lienProduit = comment.preparedHtmlContent.match(/<a.*.a>/gm)[0].match(/title.*."/gm)[0].match(/(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/gm)[0].replace(/<[^>]*>?/gm, '')
        if (!lienProduit.includes("http")) {
            lienProduit = "https://" + lienProduit
        }
        embed.addFields({ name: 'Lien Produit : ', value: '['+lienProduit+']('+lienProduit+')' },)
    }
    webhookClient.send({
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
        for (let index = 0; index < forumCode.length; index++) {
            await getNewData(forumCode[index].toString());
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
