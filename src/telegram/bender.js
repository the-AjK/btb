/**
 * bender.js
 * Bender quotes
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";

const quotes = [{
        id: "",
        tags: ["friend", "sad"],
        text: ["You know, <name>, of all the friends I've had,", "you're the first"]
    },
    {
        id: "",
        tags: ["hi", "help"],
        text: ["Tho whom it may concern: I, Bender, bid you hello!", "You don't know me, though you may have heard of me,", "but that's not the pointm long story short...", "I need helf/p"]
    },
    {
        id: "",
        tags: ["fuck"],
        text: ["Game's over, losers!", "I have all the money!", "Compare your lives to mine and then kill yourselves"]
    },
    {
        id: "",
        tags: ["drink", "hi"],
        text: ["Why would a robot need to drink?", "I don't need to drink, I can quit anytime I want!"]
    },
    {
        id: "",
        tags: ["sad"],
        text: ["I don't have emotions and sometimes that makes me very sad"]
    },
    {
        id: "",
        tags: ["fuck"],
        text: ["I say the whole world must learn of out peaceful ways...", "by force!"]
    },
    {
        id: "",
        tags: ["fuck", "shutup"],
        text: ["You should say something else"]
    },
    {
        id: "",
        tags: ["fuck"],
        text: ["I'm so embarassed,", "I wish everybody else was dead."]
    },
    {
        id: "",
        tags: ["fuck", "sad"],
        text: ["My life,", "and by extension everyone else's,", "is meaningless"]
    },
    {
        id: "",
        tags: ["happy"],
        text: ["You've succeeded in convincing me life is worth living..."]
    },
    {
        id: "",
        tags: ["fuck", "shutup"],
        text: ["Hey, do I preach to you when you're busy doing the BiteTheBot?", "No."]
    },
    {
        id: "",
        tags: ["thinking"],
        text: ["Should I get one 300 dollar hooker?", "or three hundred 1 dollar hookers?"]
    },
    {
        id: "",
        tags: ["waiting"],
        text: ["Aw! Are you still hung up on Whatshername?", "Move on already!"]
    },
    {
        id: "",
        tags: ["shutup", "imright"],
        text: ["Maybe you're right.", "Maybe I'm always right"]
    },
    {
        id: "",
        tags: ["laugh", "fuck"],
        text: ["Soon, we'll be able to look back on this and laugh.", "Aaaahhahaha"]
    },
    {
        id: "",
        tags: ["bet"],
        text: ["I bet I can eat nachos and go to the bathromm at the same time!"]
    },
    {
        id: "",
        tags: ["fuck", "shutup", "bite", "ass"],
        text: ["Bite my shiny metal ass!"]
    },
    {
        id: "",
        tags: ["fuck", "shutup", "bite", "ass"],
        text: ["Bite my red-hot-glowing ass!"]
    },
    {
        id: "",
        tags: ["fuck", "shutup", "bite", "lick", "ass"],
        text: ["Lick my frozen metal ass!"]
    },
    {
        id: "",
        tags: ["fuck", "shutup", "bite", "ass"],
        text: ["Bite my colossal metal ass!"]
    },
    {
        id: "",
        tags: ["fuck", "shutup", "bite", "ass"],
        text: ["Bite my glorious golden ass!"]
    },
    {
        id: "",
        tags: ["fuck", "shutup"],
        text: ["This is the worst kind of discrimination there is:", "the kind against me!"]
    },
    {
        id: "",
        tags: ["fuck", "shutup", "laugh"],
        text: ["Hahahahaha.", "Oh wait you’re serious.", "Let me laugh even harder."]
    },
    {
        id: "",
        tags: ["hi"],
        text: ["There. Now no one can say I don’t own John Larroquette’s spine."]
    },
    {
        id: "",
        tags: ["thinking"],
        text: ["I’ll build by own theme park.", "With black jack, and hookers.", "In fact, forget the park!"]
    },
    {
        id: "",
        tags: ["bender", "cool", "you", "thanks"],
        text: ["That’s closest thing to ‘Bender is great’ that anyone other me has ever said."]
    },
    {
        id: "",
        tags: ["hi", "drink"],
        text: ["I’m Bender, baby!", "Oh god, please insert liquor!"]
    },
    {
        id: "",
        tags: ["hi", "kill"],
        text: ["Hey sexy mama,", "wanna kill all humans?"]
    },
    {
        id: "",
        tags: ["hi"],
        text: ["You know what cheers me up?", "Other people’s misfortune."]
    },
    {
        id: "",
        tags: ["hi"],
        text: ["Anything less than immortality is a complete waste of time."]
    },
    {
        id: "",
        tags: ["blackmail", "extortion"],
        text: ["Blackmail is such an ugly word.", "I prefer extortion.", "The ‘x’ makes it sound cool."]
    },
    {
        id: "",
        tags: ["hi", "fuck"],
        text: ["Oh, your God!"]
    },
    {
        id: "",
        tags: ["fuck", "shutup", "ass"],
        text: ["You’re a pimple on society’s ass and you’ll never amount to anything!"]
    },
    {
        id: "",
        tags: ["fuck", "shutup"],
        text: ["Shut up baby, I know it!"]
    },
    {
        id: "",
        tags: ["fuck", "shutup"],
        text: ["I got ants my butt, and I needs to strut!"]
    },
    {
        id: "",
        tags: ["kill", "afterlife"],
        text: ["Afterlife?", "If I thought I had to live another life, I’d kill myself right now!"]
    }
]

function randomInt(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getTagQuotes(tags) {
    let q = [];
    for (let i = 0; i < tags.length; i++) {
        for (let j = 0; j < quotes.length; j++) {
            if (quotes[j].tags.indexOf(tags[i]) != -1) {
                q.push(quotes[j]);
            }
        }
    }
    return q;
}

exports.getRandomTagQuote = function (tags) {
    const q = shuffle(getTagQuotes(tags));
    return q[randomInt(0, q.length)].text;
}

//exports.quotes = quotes;