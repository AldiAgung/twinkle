# Twinkle

![Lint](https://github.com/kenrick95/twinkle/workflows/Lint/badge.svg)

Catatan: Ini adalah merupakan fork dari [AzaToth's Twinkle](https://github.com/azatoth/twinkle/) untuk pengguan di Wikipedia Indonesia.

-----

Twinkle adalah sebuah aplikasi JavaScript yang memberikan pengguna Wiki sebuah cara cepat melakukan tugas umum, seperti menominasi halaman dan membersihkan vandalisme.

Lihat [Wikipedia:Twinkle][] di Wikipedia Indonesia untuk informasi lanjutan.

[AzaToth][] is the original author and maintainer of the tool, as well as the `morebits.js` library gadget, which forms the basis for many Wikipedia scripts and editing tools in addition to Twinkle.

## How to file a bug report or feature request

If you're unsure whether you are experiencing a Twinkle-based bug, you should first try asking at [Wikipedia talk:Twinkle][], where other editors may assist you.  Bugs may be filed either here or at [Wikipedia talk:Twinkle][].  For simple feature requests or changes (e.g., a template was deleted or renamed) feel free to open an issue or pull request here, but for more significant changes, consider discussing the idea on [Wikipedia talk:Twinkle][] and any relevant pages first to ensure there is consensus for the change and to get broader community input.  If you believe you have found a security issue, follow the guidelines in [SECURITY.md](./SECURITY.md).

If you'd like to start contributing, awesome!  Check out [CONTRIBUTING.md](CONTRIBUTING.md) to get started!


## Layout of this repository

* `morebits.js`: The central library used by Twinkle and many other scripts. Contains code to interact with the MediaWiki API, display forms and dialogs, generate status logs, and do various other useful things. The vast majority of code in here is not Twinkle-specific.
* `twinkle.js`: General Twinkle-specific code, mostly related to preferences and exposing Twinkle in the UI. Significantly, it contains the default set of preferences of Twinkle.
* `modules`: Contains the individual Twinkle modules. Descriptions for these can be found in header comments or in the [Twinkle documentation][]. The module `twinkleconfig.js` powers the [Twinkle preferences panel][WP:TWPREFS].


[select2][] ditambahkan dibawah [lisensi MIT](https://github.com/select2/select2/blob/develop/LICENSE.md).

[Wikipedia:Twinkle]: https://id.wikipedia.org/wiki/Wikipedia:Twinkle
[AzaToth]: https://en.wikipedia.org/wiki/User:AzaToth
[Wikipedia talk:Twinkle]: https://id.wikipedia.org/wiki/Wikipedia_talk:Twinkle
[Twinkle documentation]: https://id.wikipedia.org/wiki/Wikipedia:Twinkle/doc
[WP:TWPREFS]: https://id.wikipedia.org/wiki/Wikipedia:Twinkle/Preferences
[select2]: https://github.com/select2/select2
