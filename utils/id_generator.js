const domain = "abcdefghijklmnopqrstuvwxyz"
const generate = (len, chars=domain) => [...Array(len)].map(() => chars.charAt(Math.floor(Math.random() * chars.length))).join('')

module.exports = function() {
    return generate(3) + '-' + generate(4) + '-' + generate(3)
}