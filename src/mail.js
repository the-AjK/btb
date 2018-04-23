/**
 * mail.js
 * Mail agent
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
"use strict";
const nodemailer = require('nodemailer'),
    PassThrough = require('stream').PassThrough,
    showdown = require('showdown'),
    remark = require('remark'),
    strip = require('strip-markdown'),
    moment = require('moment'),
    PDFDocument = require('pdfkit');

const transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE || "Gmail",
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
    }
});

const _sendMail = (message, cb) => {
    transporter.sendMail(message, (err, info) => {
        if (err) {
            console.error(err);
        } else {
            if (info.accepted.length > 0) {
                //Message sent

            } else {
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

exports.sendOrdersCompleteMail = (to, message, cb) => {

    const title = "Daily orders " + moment().format("DD/MM/YYYY");

    const doc = new PDFDocument,
        converter = new showdown.Converter({
            simpleLineBreaks: true
        }),
        docstream = new PassThrough(),
        stream = doc.pipe(docstream)
        .on('finish', () => {
            transporter.sendMail({
                to: to,
                subject: title,
                html: converter.makeHtml("##BiteTheBot\n###" + title +  message),
                attachments: [{
                    content: docstream,
                    contentType: 'application/pdf',
                    filename: "BTB_orders_" + moment().format("YYYY_MM_DD") + ".pdf",
                }]
            }, cb);
        });

    //Remove the markdown to generate a clean PDF
    remark()
        .use(strip)
        .process("BiteTheBot - " + title + "\n" + message, function (err, file) {
            if (err) {
                console.error(err);
            } else {
                doc.fontSize(15)
                    .text(String(file), 100, 100);
                doc.end();
            }
        });

}