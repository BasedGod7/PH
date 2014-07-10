/**
 * Core
 * Created by CreaturePhil - https://github.com/CreaturePhil
 *
 * This is where essential core infrastructure of
 * Pokemon Showdown extensions for private servers.
 * Core contains standard streams, profile infrastructure,
 * elo rating calculations, and polls infrastructure.
 *
 * @license MIT license
 */

var fs = require("fs");
var path = require("path");

var core = exports.core = {

    stdin: function (file, name) {
        var data = fs.readFileSync('config/' + file + '.csv', 'utf8').split('\n');

        var len = data.length;
        while (len--) {
            if (!data[len]) continue;
            var parts = data[len].split(',');
            if (parts[0].toLowerCase() === name) {
                return parts[1];
            }
        }
        return 0;
    },

    stdout: function (file, name, info, callback) {
        var data = fs.readFileSync('config/' + file + '.csv', 'utf8').split('\n');
        var match = false;

        var len = data.length;
        while (len--) {
            if (!data[len]) continue;
            var parts = data[len].split(',');
            if (parts[0] === name) {
                data = data[len];
                match = true;
                break;
            }
        }

        if (match === true) {
            var re = new RegExp(data, 'g');
            fs.readFile('config/' + file + '.csv', 'utf8', function (err, data) {
                if (err) return console.log(err);

                var result = data.replace(re, name + ',' + info);
                fs.writeFile('config/' + file + '.csv', result, 'utf8', function (err) {
                    if (err) return console.log(err);
                    typeof callback === 'function' && callback();
                });
            });
        } else {
            var log = fs.createWriteStream('config/' + file + '.csv', {
                'flags': 'a'
            });
            log.write('\n' + name + ',' + info);
            typeof callback === 'function' && callback();
        }
    },

    atm: {

        name: function (online, user) {
            if (online === true) {
                return '<strong>' + user.name + '</strong>';
            }
            return '<strong>' + user + '</strong>';
        },


        money: function (user) {
            return Core.stdin('money', user);
        },

        display: function (args, info, option) {
            if (args === 'money') return '&nbsp;tiene ' + info + '&nbsp;PokeDolares.';
        },

    },

    shop: function (showDisplay) {
        var shop = [
            ['Simbolo', 'Un simbolo personalizado junto a tu nick.', 5],
            ['Cambio', 'Compras la capacidad de cambiar tu avatar personalizado o tarjeta de entrenador.', 15],
			['Declare', 'Puedes hacer un declare en el server', 30],
            ['Avatar', 'Un avatar personalizado.', 50],
            ['Trainer', 'Tarjeta de entrenador.', 60],
            ['Chatroom', 'Una sala de chat.', 120]
        ];

        if (showDisplay === false) {
            return shop;
        }

		var shopName = '<center><img src="http://i.imgur.com/xA7ruKZ.png" /><div class="shop">';
		
		var s = shopName;
        s += '<table border="0" cellspacing="0" cellpadding="5" width="100%"><tbody><tr><th>Nombre</th><th>Descripción</th><th>Precio</th></tr>';
        var start = 0;
        while (start < shop.length) {
            s = s + '<tr><td><button name="send" value="/buy ' + shop[start][0] + '">' + shop[start][0] + '</button></td><td>' + shop[start][1] + '</td><td>' + shop[start][2] + '</td></tr>';
            start++;
        }
        s += '</tbody></table><br /><center>Para comprar un producto de la tienda, usa el comando /buy [nombre].</center><br /></div><img src="http://i.imgur.com/fyLaZTn.png" /></center>';
        return s;
    },
};
