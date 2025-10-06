# Twinkle

![Lint](https://github.com/kenrick95/twinkle/workflows/Lint/badge.svg)

Catatan: Ini adalah merupakan fork dari [AzaToth's Twinkle](https://github.com/azatoth/twinkle/) untuk penggunaan di Wikipedia Indonesia.

-----

Twinkle adalah sebuah aplikasi JavaScript yang memberikan pengguna Wiki sebuah cara cepat melakukan tugas umum, seperti menominasi halaman dan membersihkan vandalisme.

Lihat [Wikipedia:Twinkle][] di Wikipedia Indonesia untuk informasi lanjutan.

[AzaToth][] adalah penulis asli dan pengurus dari alat ini, seperti halnya pustaka gawai `morebits.js`, yang membentuk dasar untuk kebanyakan skrip Wikipedia dan alat menyunting sebagai tambahan ke Twinkle.

## Bagaimana cara untuk melaporkan sebuah galat atau permintaan fitur

Jika anda tidak yakin dalam mengalami galat Twinkle, anda diharapkan untuk berbicara terlebih dahulu di [Wikipedia pembicaraan:Twinkle][], penyunting lainnya akan membantumu.  Galat dapat diisi disni atau di [Wikipedia pembicaraan:Twinkle][]. Untuk permintaan fitur sederhana atau perubahan (mis., sebuah templat dihapus atau dinamakan ulang) bukalah sebuah ''issu'' atau ''pull request'' disini, untuk perubahan signifikan, tolong diskusikan di [Wikipedia pembicaraan:Twinkle][] dan halaman-halaman relevan lainnya terlebih dahulu untuk memastikan adanya konsensus mengenai perubahan tersebut dan untuk mendapatkan masukan dari komunitas yang lebih luas. Jika Anda yakin telah menemukan masalah keamanan, ikuti panduan di [SECURITY.md](./SECURITY.md).

Jika anda tetarik untuk berkontribusi, mengagumkan!  Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk memulai!


## Struktur dari repositori ini

* `morebits.js`: Pustaka utama yang digunakan Twinkle dan kebanyakan skrip lainnya. Berisi kode untuk berinteraksi dengan API MediaWiki, tampilan formulir dan dialogs, generate status logs, dan melakukan hal-hal lainnya. The vast majority of code in here is not Twinkle-specific.
* `twinkle.js`: Kode khusus Twinkle umum, sebagian besar terkait dengan preferensi dan menampilkan Twinkle di UI. Yang penting, kode ini berisi serangkaian preferensi bawaan Twinkle.
* `modules`: Berisi modul Twinkle individual. Deskripsi untuk modul ini dapat ditemukan di komentar header atau di [Twinkle documentation][]. Modul `twinkleconfig.js` memberdayai [panel preferensi Twinkle][WP:TWPREFS].


[select2][] ditambahkan dibawah [lisensi MIT](https://github.com/select2/select2/blob/develop/LICENSE.md).

[Wikipedia:Twinkle]: https://id.wikipedia.org/wiki/Wikipedia:Twinkle
[AzaToth]: https://en.wikipedia.org/wiki/User:AzaToth
[Wikipedia talk:Twinkle]: https://id.wikipedia.org/wiki/Wikipedia_talk:Twinkle
[Dokumentasi Twinkle]: https://id.wikipedia.org/wiki/Wikipedia:Twinkle/doc
[WP:TWPREFS]: https://id.wikipedia.org/wiki/Wikipedia:Twinkle/Preferences
[select2]: https://github.com/select2/select2
