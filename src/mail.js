/**
 * mail.js
 * Mail agent
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE || "Gmail",
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
    }
});

exports.sendMail = (to, subject) => {

    let message = {
        to: to,
        subject: 'BiteTheBot - noReply',
        //text: 'Plaintext version of the message',
        html: '<p>HTML version of the message</p>'
    };

    transporter.sendMail(message, (err, info) => {
        if (err) {
            console.error(err);
        } else {
            if(info.accepted.length > 0){
                //Message sent

            }else{
                console.warn(info)
            }
            /*info.messageId most transports should return the final Message-Id value used with this property
            info.envelope includes the envelope object for the message
            info.accepted is an array returned by SMTP transports (includes recipient addresses that were accepted by the server)
            info.rejected is an array returned by SMTP transports (includes recipient addresses that were rejected by the server)
            info.pending is an array returned by Direct SMTP transport. Includes recipient addresses that were temporarily rejected together with the server response
            response is a string returned by SMTP transports and includes the last SMTP response from the server*/


        }
    });
}