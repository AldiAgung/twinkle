// <nowiki>

(function() {

/*
 ****************************************
 *** twinklespeedy.js: CSD module
 ****************************************
 * Mode of invocation:     Tab ("CSD")
 * Active on:              Non-special, existing pages
 *
 * NOTE FOR DEVELOPERS:
 *   If adding a new criterion, add it to the appropriate places at the top of
 *   twinkleconfig.js.  Also check out the default values of the CSD preferences
 *   in twinkle.js, and add your new criterion to those if you think it would be
 *   good.
 */

Twinkle.speedy = function twinklespeedy() {
	// Disable on:
	// * special pages
	// * non-existent pages
	if (mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId')) {
		return;
	}

	Twinkle.addPortletLink(Twinkle.speedy.callback, 'KPC', 'tw-csd', Morebits.userIsSysop ? 'Menghapus halaman menurut WP:KPC' : 'Meminta penghapusan cepat menurut WP:KPC');
};

Twinkle.speedy.data = [
	{
		list: 'customRationale',
		label: 'Penghapusan khusus' + (Morebits.userIsSysop ? ' (alasan penghapusan lainnya)' : ' gunakan templat {{db}}'),
		code: 'db',
		db: 'reason',
		tooltip: '{{db}} kependekan dari "dihapus karena". Sekurang-kurangnya satu kriteria harus diberikan, dan sebutkan alasannya.',
		subgroup: {
			name: 'reason_1',
			type: 'input',
			label: 'Rationale:',
			size: 60
		},
		hideWhenMultiple: true
	},
	{
		list: 'talkList',
		label: 'U8: Halaman pembicaraan yatim',
		code: 'g8',
		db: 'talk',
		tooltip: 'Ini tidak termasuk halaman yang berguna untuk proyek, khususnya halaman pembicaraan pengguna, arsip pembicaraan pengguna, dan halaman pembicaraan untuk halaman berkas yang ada di Commons.'
	},
	{
		list: 'fileList',
		label: 'B1: Redundan atau duplikat',
		code: 'f1',
		db: 'redundantimage',
		tooltip: 'Berkas atau media tak terpakai yang merupakan sebuah salinan, dengan format yang sama dan resolusi/kualitas yang sama/lebih rendah, dari sebuah berkas atau media lain di Wikipedia. Yang tidak termasuk di dalamnya adalah duplikat berkas atau media di Wikimedia Commons, karena alasan-alasan lisensi',
		subgroup: {
			name: 'redundantimage_filename',
			type: 'input',
			label: 'Berkas ini redundan ke:',
			tooltip: 'Prefix "Berkas:" dapat dibiarkan.'
		}
	},
	{
		list: 'fileList',
		label: 'B2: Rusak atau kosong',
		code: 'f2',
		db: 'noimage',
		tooltip: 'Sebelum menghapus berkas jenis ini, pastikan bahwa mesin MediaWiki tidak dapat membaca berkas tersebut dengan cara pratayang gambar yang diperkecil. Pemuat aslinya dapat memperbaikinya dengan cara memuatkan versi berkas yang tidak rusak'
	},
	{
		list: 'fileList',
		label: 'B2: Halaman deskripsi berkas yang tidak dibutuhkan untuk berkas yang berada di Commons',
		code: 'f2',
		db: 'fpcfail',
		tooltip: 'Gambar yang disimpan di Commons tanpa tag atau informasi pada halaman deskripsi di Wikipedia bahasa Indonesia yang tidak diperlukan lagi',
		hideWhenMultiple: true
	},
	{
		list: 'fileList',
		label: 'B3: Lisensi yang tidak sesuai',
		code: 'f3',
		db: 'noncom',
		tooltip: 'Berkas atau media yang diberi lisensi "untuk tujuan non komersial saja" (termasuk lisensi Creative Commons nonkomersial), "tanpa karya turunan" atau "gunakan dengan izin" dapat dihapus, kecuali berkas tersebut memenuhi standar pemakaian konten tak bebas. Berkas yang berlisensi GFDL sebelum versi 1.3, yang tidak mengizinkan versi setelahnya, dapat dihapus'
	},
	{
		list: 'fileList',
		label: 'B4: Informasi lisensi kurang',
		code: 'f4',
		db: 'unksource',
		tooltip: 'Berkas dan media yang tidak memiliki informasi lisensi yang cukup, dapat dihapus setelah diidentifikasi sebagai berkas tanpa informasi lisensi yang cukup selama tujuh hari jika informasinya tidak ditambahkan. Perhatikan bahwa pemuat berkas terkadang menyebutkan sumbernya di ringkasan pemuatan.',
		hideWhenUser: true
	},
	{
		list: 'fileList',
		label: 'B5: Berkas tak bebas yang tak digunakan',
		code: 'f5',
		db: 'f5',
		tooltip: 'Berkas dan media yang tidak memiliki lisensi bebas atau domain publik, yang tidak digunakan di artikel manapun, dapat dihapus setelah diidentifikasi sebagai berkas tak bebas yang tak digunakan selama tujuh hari. Perkecualian dapat diberikan kepada berkas yang akan digunakan untuk artikel yang sedang ditulis/dipersiapkan.',
		hideWhenUser: true
	},
	{
		list: 'fileList',
		label: 'B6: Tidak memiliki alasan penggunaan tak bebas',
		code: 'f6',
		db: 'norat',
		tooltip: 'Yang termasuk di dalamnya: Berkas dan media tak bebas yang ditulis sebagai "penggunaan wajar" namun tidak menyediakan alasan yang rasional dapat dihapus setelah diidentifikasi sebagai berkas tanpa alasan penggunaan tak bebas selama tujuh hari. Tag {{Fair use}} saja tidak merupakan alasan yang sah. Yang tidak termasuk di dalamnya: alasan telsh diberikan namun diperdebatkan.',
		hideWhenUser: true
	},
	{
		list: 'fileList',
		label: 'B7: Klaim penggunaan wajar tidak sah',
		code: 'f7',
		db: 'badfairuse',
		tooltip: 'Berkas atau media tak bebas dengan templat penggunaan wajar yang jelas-jelas tidak sah (seperti tag {{Logo}} pada sebuah foto maskot) dapat dihapus dengan segera.',
		subgroup: {
			name: 'badfairuse_rationale',
			type: 'input',
			label: 'Penjelasan (opsional):',
			size: 60
		},
		hideWhenMultiple: true
	},
	{
		list: 'fileList',
		label: 'B8: Berkas yang sama persis tersedia di Wikimedia Commons',
		code: 'f8',
		db: 'commons',
		tooltip: 'Syarat: (1) Versi di Commons memiliki format yang sama dan memiliki kualitas/resolusi yang sama atau lebih tinggi. (2) Lisensi dan sumber tidak diragukan lagi, dan lisensi yang digunakan merupakan lisensi Commons yang berterima. (2) Semua informasi pada berkas lokal juga ada di Commons, termasuk sejarah pemuatan yang lengkap dengan pranala ke halaman pengguna pemuat lokal. (3) Jika nama yang digunakan di Commons berbeda dengan di lokal, semua penggunaan berkas di lokal harus disesuaikan (diganti) sesuai dengan nama yang terdapat di Commons.(4) Berkas tidak dilindungi. JANGAN MENGHAPUS BERKAS YANG DILINDUNGI, meskipun ada duplikatnya di Commons. Berkas seperti itu biasanya dimuat di wiki lokal dan dilindungi karena digunakan pada antar muka atau templat yang beresiko tinggi',
		subgroup: {
			name: 'commons_filename',
			type: 'input',
			label: 'Nama berkas di Commons:',
			value: Morebits.pageNameNorm,
			tooltip: 'Kosongkan jika berkasnya memiliki nama yang sama. Awalan "Berkas:" opsional.'
		},
		hideWhenMultiple: true
	},
	{
		list: 'fileList',
		label: 'B9: Terang-terangan melanggar hak cipta',
		code: 'f9',
		db: 'imgcopyvio',
		tooltip: 'Yang termasuk di dalamnya: berkas atau media yang diklaim sebagai berkas berlisensi bebas padahal sebenarnya bukan. Sebuah URL atau indikasi lokasi sumber harus disediakan. Yang tidak termasuk di dalamnya: berkas dengan klaim penggunaan bebas, atau berkas dengan klaim yang dapat dipercaya dari pemiliknya yang telah melepasnya di bawah lisensi bebas yang kompatibel dengan lisensi Wikipedia. Ini termasuk gambar-gambar dari perpustakaan foto stok seperti Getty Images dan Corbis',
		subgroup: [
			{
				name: 'imgcopyvio_url',
				type: 'input',
				label: 'URL sumber konten, termasuk "http://". Jika tidak dapat memberikan URL, mohon tidak menggunakan KPC B9.',
				size: 60
			},
			{
				name: 'imgcopyvio_rationale',
				type: 'input',
				label: 'Alasan penghapusan untuk copyvio non-internet:',
				size: 60
			}
		]
	},
	{
		list: 'fileList',
		label: 'B11: Tak ada bukti izin penggunaan',
		code: 'f11',
		db: 'nopermission',
		tooltip: 'Yang termasuk di dalamnya: jika pemuat mencantumkan sebuah lisensi dan menyatakan bahwa pihak ketiga sebagai sumber atau pemegang lisensi tanpa memberikan bukti bahwa pihak ketiga tersebut telah setuju dengan lisensi tersebut, berkas yang dimaksud dapat dihapus tujuh hari setelah pemberitahuan kepada sang pemuat',
		hideWhenUser: true
	},
	{
		list: 'fileList',
		label: 'U8: Halaman deksripsi berkas tanpa adanya berkas',
		code: 'g8',
		db: 'imagepage',
		tooltip: 'Gunakan ini jika berkas benar-benar tidak ada. Berkas rusak, dan halaman deskripsi lokal di Commons, harus menggunakan B2; pengalihan tidak sesuai gunakan R3; dan pengalihan rusak ke Commons gunakan U6.'
	},
	{
		list: 'articleList',
		label: 'A1: Artikel tanpa konteks.',
		code: 'a1',
		db: 'nocontext',
		tooltip: 'Yang termasuk di dalamnya: artikel tanpa konteks yang tidak cukup untuk berdiri sendiri ataupun untuk dikembangkan lebih lanjut. Hanya dapat berlaku untuk artikel sangat pendek. Konteks berbeda dengan isi.'
	},
	{
		list: 'articleList',
		label: 'A2: Artikel berbahasa asing yang tidak diterjemahkan atau diterjemahkan secara buruk',
		code: 'a2',
		db: 'foreign',
		tooltip: 'Yang termasuk di dalamnya: artikel dari proyek Wikimedia lainnya yang tidak diterjemahkan sama sekali atau yang diterjemahkan secara buruk (dengan atau tanpa bantuan mesin penerjemah). Jika sudah diterjemahkan hingga kriteria sebuah stub, maka bagian yang tidak diterjemahkan sajalah yang harus dipotong. Yang tidak termasuk di dalamnya: artikel yang tidak dari proyek Wikimedia lainnya yang bisa diberi templat {{terjemah}}',
		subgroup: {
			name: 'foreign_source',
			type: 'input',
			label: 'Pranala interwiki ke artikel di wiki bahasa asing:',
			tooltip: 'Misalnya, en:Indonesia'
		}
	},
	{
		list: 'articleList',
		label: 'A3: Tanpa isi',
		code: 'a3',
		db: 'nocontent',
		tooltip: 'Yang termasuk di dalamnya: artikel (selain halaman disambiguasi, pengalihan, atau pengalihan lunak) yang hanya terdiri dari salah satu hal atau kombinasi dari hal-hal berikut: pranala luar, kategori, templat selain kotak info, gambar, bagian "lihat pula", judul yang di-parafrase-kan, usaha untuk menghubungi orang atau kelompok yang digunakan sebagai judul, atau komentar layaknya orang berdiskusi. Yang tidak termasuk di dalamnya: artikel pendek yang memiliki isi walaupun pendek tidak dapat dihapus menggunakan kriteria ini. Kriteria ini juga tidak berlaku untuk halaman dengan sebuah kotak info dan informasi yang nontrivia'
	},
	{
		list: 'articleList',
		label: 'A7: Tidak mengindikasikan kepentingan (tokoh, organisasi, isi situs)',
		code: 'a7',
		db: 'a7',
		tooltip: 'Artikel tentang tokoh, organisasi (termasuk di dalamnya band, klub, perusahaan, dll., kecuali sekolah), atau isi situs yang tidak menunjukkan alasan mengapa subyek itu dianggap penting. Jika yang kontroversial, maka Anda dapat mengusulkan penghapusan dengan templat {{hapus}} atau membawanya ke halaman Wikipedia:Usulan penghapusan',
		hideWhenSingle: true
	},
	{
		list: 'articleList',
		label: 'A9: Artikel yang tidak mengindikasikan kepentingan (rekaman musik)',
		code: 'a9',
		db: 'a9',
		tooltip: 'Artikel tentang rekaman musik yang tidak menunjukkan alasan mengapa subyek itu dianggap penting dan/atau yang artikel tentang rekaman musik yang artisnya tidak ada di Wikipedia bahasa Indonesia'
	},
	{
		list: 'articleList',
		label: 'A10: Artikel yang tidak dirapikan dalam batas waktu yang telah ditentukan',
		code: 'a10',
		db: 'a10',
		tooltip: 'Artikel yang tidak dirapikan dalam batas waktu yang telah ditentukan, baik oleh pembuat artikel maupun oleh Wikipediawan lain, sehingga dapat dianggap keberadaannya di Wikipedia hanya akan menurunkan kualitas Wikipedia bahasa Indonesia.',
		subgroup: {
			name: 'a10_article',
			type: 'input',
			label: 'Artikel serupa:'
		}
	},
	{
		list: 'articleList',
		label: 'A11: Tidak ada kepentingan klaim',
		code: 'a11',
		db: 'madeup',
		tooltip: 'Artikel yang secara gamblang menyatakan bahwa topiknya diciptakan/diciptakan/ditemukan oleh pembuat artikel atau seseorang yang mereka kenal secara pribadi, dan tidak secara meyakinkan menyatakan mengapa topiknya penting atau signifikan'
	},
	{
		list: 'categoryList',
		label: 'K1: Kategori tanpa isi',
		code: 'c1',
		db: 'catempty',
		tooltip: 'Kategori tanpa isi yang selama paling tidak empat hari masih tidak memiliki isi. Yang tidak termasuk di dalamnya: kategori disambiguasi, pengalihan kategori (isi sudah dipindahkan ke kategori lain), kategori topik pilihan, duplikat dengan kategori lain, atau kategori yang menurut naturnya dapat menjadi kosong sewaktu-waktu (mis. kategori yang ditransklusikan oleh kotak pengguna.) Bubuhkan {{kategori kosong}} di bagian atas kategori kosong untuk menghindari agar kategori tersebut tidak dihapus.)'
	},
	{
		list: 'categoryList',
		label: 'K4: Kategori pemeliharaan tak terpakai',
		code: 'c4',
		db: 'c4',
		tooltip: 'Kategori pemeliharaan yang tidak digunakan, seperti kategori pemeliharaan bertanggal kosong untuk tanggal di masa lalu, kategori pelacakan yang tidak lagi digunakan oleh templat setelah penulisan ulang, atau subkategori kosong dari Kategori:Wikipedia akunganda atau Kategori:Diduga sockpuppets Wikipedia. Kategori pemeliharaan yang kosong belum tentu tidak digunakan—kriteria ini berlaku untuk kategori yang akan selalu kosong, bukan hanya yang sedang kosong..',
		subgroup: {
			name: 'c4_rationale',
			type: 'input',
			label: 'Optional explanation:',
			size: 60
		}
	},
	{
		list: 'templateList',
		label: 'T5: Templat subhalaman tidak terpakai',
		code: 't5',
		db: 't5',
		tooltip: 'Modul Lua dan subhalaman templat yang tak terpakai. Hal ini tidak berlaku untuk subhalaman /testcases dan /sandbox, atau subhalaman dari Modul:Kotak Pasir.'
	},
	{
		list: 'userList',
		label: 'H1: Permintaan pengguna',
		code: 'u1',
		db: 'userreq',
		tooltip: 'Permintaan Wikipediawan yang memulai halaman itu, jika halaman tersebut belum disunting secara berarti oleh pengguna lain. Jika pembuat halaman mengosongkan halaman yang dibuatnya, hal ini dapat diartikan bahwa ia menginginkan halaman tersebut dihapus',
		subgroup: mw.config.get('wgNamespaceNumber') === 3 && !mw.config.get('wgTitle').includes('/') ? {
			name: 'userreq_rationale',
			type: 'input',
			label: 'Alasan penghapusan (wajib):',
			tooltip: 'Halaman pembicaraan pengguna dihapus hanya dalam keadaan langka tertentu.',
			size: 60
		} : null,
		hideSubgroupWhenMultiple: true
	},
	{
		list: 'userList',
		code: 'u2',
		label: 'H2: Pengguna tidak nyata',
		db: 'nouser',
		tooltip: 'Halaman pengguna dari pengguna tidak nyata (Cek Istimewa:daftarpengguna)'
	},
	{
		list: 'userList',
		label: 'H5: Non-kontributor menyalahgunaan Wikipedia sebagai hos web pribadi',
		code: 'u5',
		db: 'notwebhost',
		tooltip: 'Halaman di ruang pengguna yang berisi tulisan, informasi, diskusi, atau aktivitas yang tidak berkaitan erat dengan tujuan Wikipedia, di mana pemiliknya hanya melakukan sedikit atau tidak melakukan penyuntingan di luar halaman pengguna, kecuali untuk draf yang masuk akal dan halaman yang mematuhi WP:UPYES. Ketentuan ini berlaku terlepas dari usia halaman yang dimaksudkan',
		hideWhenRedirect: true
	},
	{
		list: 'userList',
		label: 'U11: Halaman pengguna untuk promosi, dengan nama pengguna untuk tujuan promosi',
		code: 'g11',
		db: 'spamuser',
		tooltip: 'Halaman pengguna untuk promosi, dengan nama pengguna untuk tujuan promosi. Perhatikan pula bahwa dengan adanya halaman mengenai perusahaan pada halaman pengguna tidak termasuk dalam kriteria ini. Jika halaman pengguna adalah spam, dan nama penggunanya tidak, tandai dengan U11 saja.',
		hideWhenMultiple: true,
		hideWhenRedirect: true
	},
	{
		list: 'userList',
		label: 'U13: Permintaan draft AfC atau draft kosong, dibiakan lebih dari 6 bulan',
		code: 'g13',
		db: 'afc',
		tooltip: 'Permintaan draft AfC yang ditolak atau tidak dikirimkan atau draft kosong, yang tidak disunting lebih dari 6 bulan (tidak termasuk suntingan bot).',
		hideWhenMultiple: true,
		hideWhenRedirect: true
	},
	{
		list: 'generalList',
		label: 'U1: Tulisan ngawur. Yang termasuk di dalamnya: Halaman-halaman yang isinya hanyalah ujaran tak keruan, tanpa makna dan isi.',
		code: 'g1',
		db: 'nonsense',
		tooltip: 'Yang tidak termasuk di dalamnya: penulisan yang buruk, terjemahan buruk, vandalisme, materi fiktif, materi berbahasa selain bahasa Indonesia, pemberitaan palsu; namun demikian, beberapa di antara yang disebutkan dapat dihapus dengan dasar vandalisme.',
		hideInNamespaces: [ 2 ] // Not applicable in userspace
	},
	{
		list: 'generalList',
		label: 'U2: Uji coba',
		code: 'g2',
		db: 'test',
		tooltip: 'Halaman yang dibuat untuk mencoba kode-kode wiki. Yang tidak termasuk di dalamnya: penyuntingan di halaman-halaman bernama "bak pasir" dan ruangnama pengguna.',
		hideInNamespaces: [ 2 ] // Not applicable in userspace
	},
	{
		list: 'generalList',
		label: 'U3: Vandalisme murni/terang-terangan',
		code: 'g3',
		db: 'vandalism',
		tooltip: 'Vandalisme murni/terang-terangan (termasuk pengalihan yang ditinggalkan dari vandalisme pemindahan halaman).'
	},
	{
		list: 'generalList',
		label: 'U3: Materi palsu terang-terangan',
		code: 'g3',
		db: 'hoax',
		tooltip: 'Materi palsu terang-terangan untuk tujuan vandalisme',
		hideWhenMultiple: true
	},
	{
		list: 'generalList',
		label: 'U4: Pembuatan ulang dari halaman yang sudah dihapus',
		code: 'g4',
		db: 'repost',
		tooltip: 'Yang termasuk di dalamnya: Salinan dari halaman yang dihapus melalui sebuah diskusi, baik melalui Wikipedia:Usulan penghapusan maupun di halaman pembicaraannya. Yang tidak termasuk di dalamnya: Pemulihan artikel melalui evaluasi penghapusan dan halaman yang dihapus tanpa melalui diskusi',
		subgroup: {
			name: 'repost_xfd',
			type: 'input',
			label: 'Halaman yang memuat diskusi penghapusan:',
			tooltip: 'Harus dimulai dengan "Wikipedia:"',
			size: 60
		}
	},
	{
		list: 'generalList',
		label: 'U5: Pengguna yang diblokir atau yang dilarang',
		code: 'g5',
		db: 'banned',
		tooltip: 'Halaman-halaman yang dibuat oleh pengguna yang sedang diblokir atau dilarang, termasuk yang terbukti membuat akun siluman, yang melanggar ketentuan pemblokiran atau peringatan kepada mereka',
		subgroup: {
			name: 'banned_user',
			type: 'input',
			label: 'Nama pengguna yang diblokir (jika ada):',
			tooltip: 'Jangan dimulai dengan "Pengguna:"'
		}
	},
	{
		list: 'generalList',
		label: 'U6: Galat',
		code: 'g6',
		db: 'error',
		tooltip: 'Halaman yang dibuat dengan kesalahan, atau pengalihan yang tersisa dari pemindahan halaman yang jelas-jelas dibuat dengan judul yang salah.',
		hideWhenMultiple: true
	},
	{
		list: 'generalList',
		label: 'U6: Pindah',
		code: 'g6',
		db: 'move',
		tooltip: 'Memberi tempat untuk pemindahan',
		subgroup: [
			{
				name: 'move_page',
				type: 'input',
				label: 'Halaman yang akan dipindahkan ke sini:'
			},
			{
				name: 'move_reason',
				type: 'input',
				label: 'Alasan:',
				size: 60
			}
		],
		hideWhenMultiple: true
	},
	{
		list: 'generalList',
		label: 'U6: XfD',
		code: 'g6',
		db: 'xfd',
		tooltip: 'Sebuah diskusi pengahpusan (di UP, UP-B, RfD, TfD, CfD, atau MfD) ditutup sebagai "hapus", tapi halamannya tidak dihapus.',
		subgroup: {
			name: 'xfd_fullvotepage',
			type: 'input',
			label: 'Halaman dimana diskusi penghapusan dilakukan:',
			tooltip: 'Dimulai dengan "Wikipedia:"',
			size: 40
		},
		hideWhenMultiple: true
	},
	{
		list: 'generalList',
		label: 'U6: Pemindahan AfC',
		code: 'g6',
		db: 'afc-move',
		tooltip: 'Membuat cara untuk sebauh draft dipindahkan ke PPH',
		subgroup: {
			name: 'draft_page',
			type: 'input',
			label: 'Draft yang akan dipindahkan kesini:'
		},
		hideWhenMultiple: true
	},
	{
		list: 'generalList',
		label: 'U6: Pemindahan salin-tempel',
		code: 'g6',
		db: 'copypaste',
		tooltip: 'Pemindahan salin-tempel halaman lain yang perlu dihapus sementara untuk membuat tempat agar dapat dipindahkan melalui peralatan Wikipedia.',
		subgroup: {
			name: 'copypaste_sourcepage',
			type: 'input',
			label: 'Halaman asal yang disalin-tempel:'
		},
		hideWhenMultiple: true
	},
	{
		list: 'generalList',
		label: 'U6: Alasan teknis',
		code: 'g6',
		db: 'g6',
		tooltip: 'Alasan teknis lainnya',
		subgroup: {
			name: 'g6_rationale',
			type: 'input',
			label: 'Alasan:',
			size: 60
		}
	},
	{
		list: 'generalList',
		label: 'U7: Permintaan pembuat halaman',
		code: 'g7',
		db: 'author',
		tooltip: 'Permintaan Wikipediawan yang memulai halaman itu, jika halaman tersebut belum disunting secara berarti oleh pengguna lain. Jika pembuat halaman mengosongkan halaman yang dibuatnya, hal ini dapat diartikan bahwa ia menginginkan halaman tersebut dihapus.',
		subgroup: {
			name: 'author_rationale',
			type: 'input',
			label: 'Penjelasan opsional:',
			tooltip: 'Alasan pembuat meminta penghapusan.',
			size: 60
		},
		hideSubgroupWhenSysop: true
	},
	{
		list: 'generalList',
		label: 'U8: Halaman yang tergantung pada halaman yang tak ada atau yang dihapus',
		code: 'g8',
		db: 'g8',
		tooltip: 'Yang termasuk di dalamnya: Pengalihan rusak (termasuk nama pengalihan yang buruk, pengalihan yang berputar), halaman pembicaraan yang artikelnya telah dihapus, subhalaman yang super-halamannya telah dihapus, halaman berkas tanpa suatu berkas, atau kategori yang isinya telah dipindahkan. Yang tidak termasuk di dalamnya: diskusi penghapusan yang tidak terdapat di tempat lain, halaman pengguna dan halaman pembicaraan pengguna, arsip pembicaraan, pengalihan rusak yang masih bisa dialihkan ke halaman lain, dan halaman berkas dan halaman pembicaraan berkas untuk berkas yang terdapat di Commons.',
		subgroup: {
			name: 'g8_rationale',
			type: 'input',
			label: 'Penjelasan opsional:',
			size: 60
		},
		hideSubgroupWhenSysop: true
	},
	{
		list: 'generalList',
		label: 'U8: Subhalaman dengan tidak ada halaman induk',
		code: 'g8',
		db: 'subpage',
		tooltip: 'This excludes any page that is useful to the project, and in particular: deletion discussions that are not logged elsewhere, user and user talk pages, talk page archives, plausible redirects that can be changed to valid targets, and file pages or talk pages for files that exist on Wikimedia Commons.',
		hideWhenMultiple: true,
		hideInNamespaces: [ 0, 6, 8 ] // hide in main, file, and mediawiki-spaces
	},
	{
		list: 'generalList',
		label: 'U10: Halaman serangan',
		code: 'g10',
		db: 'attack',
		tooltip: 'Serangan atau olokan terhadap subyek atau entitas lain.  Yang termasuk di dalamnya: Ancaman, artikel biografi orang hidup yang isinya semuanya bernada negatif dan tidak memiliki sumber (dan di sejarah revisinya tidak ada versi yang netral yang dapat digunakan). Judul artikel dan isi artikel dapat dipakai untuk menentukan apakah artikel tersebut masuk kategori ini atau tidak!'
	},
	{
		list: 'generalList',
		label: 'U10: Biografi orang hidup yang semuanya bernada negatif dan tanpa sumber',
		code: 'g10',
		db: 'negublp',
		tooltip: 'Artikel biografi orang hidup yang isinya semuanya bernada negatif dan tidak memiliki sumber (dan di sejarah revisinya tidak ada versi yang netral yang dapat digunakan).',
		hideWhenMultiple: true
	},
	{
		list: 'generalList',
		label: 'U11: Iklan atau promosi terang-terangan',
		code: 'g11',
		db: 'spam',
		tooltip: 'Yang termasuk di dalamnya: Halaman yang dibuat dengan tujuan utama untuk mempromosikan suatu entitas, dan yang tidak ensiklopedis (yang perlu ditulis ulang agar bersifat ensiklopedis). Yang tidak termasuk di dalamnya: artikel yang memiliki judul suatu nama perusahaan atau produk tidak secara otomatis masuk ke kategori ini'
	},
	{
		list: 'generalList',
		label: 'U12: Pelanggaran hak cipta terang-terangan',
		code: 'g12',
		db: 'copyvio',
		tooltip: 'Yang termasuk di dalamnya: Halaman dengan teks yang berhak cipta tanpa adanya suatu pemberitahuan yang jelas bahwa teks tersebut diberi lisensi domain publik, penggunaan bebas, atau penggunaan gratis, dan tidak ada bagian dari teks yang tidak melanggar hak cipta yang patut diselamatkan. Kecuali jika ditinjau dari riwayat halamannya tidak ada versi yang bisa digunakan untuk menggantikan versi yang melanggar hak cipta, maka halaman tersebut akan dihapus seluruh isinya',
		subgroup: [
			{
				name: 'copyvio_url',
				type: 'input',
				label: 'URL (jika ada):',
				tooltip: 'Jika merupakan sumber daring, berikan di sini, dan tulis protokol "http://" atau "https://.',
				size: 60
			},
			{
				name: 'copyvio_url2',
				type: 'input',
				label: 'URL tambahan:',
				tooltip: 'Opsional. Harus dimulai dengan "http://" atau "https://"',
				size: 60
			},
			{
				name: 'copyvio_url3',
				type: 'input',
				label: 'URL tambahan: ',
				tooltip: 'Opsional. Harus dimulai dengan "http://" atau "https://"',
				size: 60
			}
		]
	},
	{
		list: 'generalList',
		label: 'U13: Artikel dibuat secara murni dengan tulisan AI generatif',
		code: 'g13',
		db: 'afc',
		tooltip: 'Artikel dibuat secara murni mengguakan alat AI, dan tanpa adanya sumber/referensi yang jelas.',
		hideWhenRedirect: true,
		showInNamespaces: [2, 118] // pengguna, hanya draft ruangnama
	},
	{
		list: 'generalList',
		label: 'U6: Halaman disambiguasi yang tak perlu',
		code: 'g6',
		db: 'disambig',
		tooltip: 'Untuk halaman disambiguasi yatim yang: (1) mendisambiguasi kurang dari dua halaman Wikipedia untuk yang judulnya berakhiran "(disambiguasi)"; atau (2) mendisambiguasi tidak ada halaman'
	},
	/* <-- Belum ada kriteria yang sesuai di WBI, silahkan hilangkan komentar ini jika sudah ada -->
	{
		list: 'generalList',
		label: 'U15: Unreviewed LLM content',
		code: 'g15',
		db: 'llm',
		tooltip: 'This only applies to pages containing any of: (1) communication intended for the user (e.g., "Here is your Wikipedia article on..."); (2) implausible non-existent references; or (3) nonsensical citations, that would otherwise have been removed with human review.',
		subgroup: [
			{
				name: 'subcriteria',
				type: 'radio',
				list: [
					{
						label: 'Communication intended for the user',
						value: 'communication',
						tooltip: 'The page contains communication intended for the user, such as "Here is your Wikipedia article on...".'
					},
					{
						label: 'Implausible non-existent references',
						value: 'implausible',
						tooltip: 'The page contains implausible non-existent references.'
					},
					{
						label: 'Nonsensical citations',
						value: 'nonsensical',
						tooltip: 'The page contains nonsensical citations.'
					}
				]
			},
			{
				name: 'reason',
				type: 'input',
				label: 'Alasan tambahan (opsional):',
				tooltip: 'Spesifikan mengapa satu dari tiga kriteria ditambahkan ke halaman ini.',
				size: 60
			}
		]
	}, */
	{
		list: 'redirectList',
		label: 'R2: Pengalihan dari ruangnama artikel ke ruangnama lain, kecuali ruangnama Kategori:, Templat:, Wikipedia:, Bantuan:, dan Portal:',
		code: 'r2',
		db: 'rediruser',
		tooltip: 'Jika pengalihan ditimbulkan karena pemindahan halaman, tunggu satu atau beberapa hari sebelum menghapus pengalihan. Lihat pula Wikipedia:Pengalihan antar-ruangnama',
		showInNamespaces: [ 0 ]
	},
	{
		list: 'redirectList',
		label: 'R3: Pengalihan yang baru dibuat karena kesalahan ketik atau kesalahan penamaan yang tidak disengaja',
		code: 'r3',
		db: 'redirtypo',
		tooltip: 'Meskipun demikian, pengalihan dari kesalahan umum pengejaan atau penamaan biasanya berguna, seperti halnya pengalihan dari istilah dalam bahasa lain'
	},
	{
		list: 'redirectList',
		label: 'R4: Pengalihan ruangnama berkas dengan nama yang sesuai dengan halaman Commons',
		code: 'r4',
		db: 'redircom',
		tooltip: 'The redirect should have no incoming links (unless the links are cleary intended for the file or redirect at Commons).',
		showInNamespaces: [ 6 ]
	},
	{
		list: 'redirectList',
		label: 'U6: Pengalihan ke halaman disambiguasi yang salah',
		code: 'g6',
		db: 'movedab',
		tooltip: 'Untuk halaman disambiguasi yang berakhiran "(disambiguasi)" yang topik utamanya tidak ada.',
		hideWhenMultiple: true
	},
	{
		list: 'redirectList',
		label: 'U8: Pengalihan ke target tidak sah',
		code: 'g8',
		db: 'redirnone',
		tooltip: 'Ini tidak berlaku untuk halaman berguna ke sebuah proyek, dan khususnya: diskusi penghapusan yang tidak dicatat di tempat lain, halaman pengguna dan pembicaraannya, arsip halaman pembicaraan, pengalihan yang dapat diperbaiki, dan halaman berkas dan pembicaraannya yang ada di Commons.',
		hideWhenMultiple: true
	},
	{
		list: 'redirectList',
		label: 'X3: Redirects with no space before a parenthetical disambiguation',
		code: 'x3',
		db: 'x3',
		tooltip: 'This excludes terms that can plausibly be searched for without spaces, or if the redirect contains substantive page history (e.g. from a merge).'
	}
];

/**
 * Given a list name such as talkList, fileList, redirectList, etc, return the CSDs that should be in that list.
 */
Twinkle.speedy.getCsdList = ( csdList ) => {
	const list = [];
	for (const item of Twinkle.speedy.data) {
		if (item.list === csdList) {
			const copy = Object.assign({}, item);
			// Change some things to match the old spec, from before I refactored this.
			delete copy.list;
			delete copy.code;
			copy.value = copy.db;
			delete copy.db;
			list.push(copy);
		}
	}
	return list;
};

Twinkle.speedy.customRationale = Twinkle.speedy.getCsdList( 'customRationale' );
Twinkle.speedy.talkList = Twinkle.speedy.getCsdList( 'talkList' );
Twinkle.speedy.fileList = Twinkle.speedy.getCsdList( 'fileList' );
Twinkle.speedy.articleList = Twinkle.speedy.getCsdList( 'articleList' );
Twinkle.speedy.categoryList = Twinkle.speedy.getCsdList( 'categoryList' );
Twinkle.speedy.templateList = Twinkle.speedy.getCsdList( 'templateList' );
Twinkle.speedy.userList = Twinkle.speedy.getCsdList( 'userList' );
Twinkle.speedy.generalList = Twinkle.speedy.getCsdList( 'generalList' );
Twinkle.speedy.redirectList = Twinkle.speedy.getCsdList( 'redirectList' );

/**
 * Iterate over Twinkle.speedy.data. Turn `code: 'g8', db: 'redirnone',` into `redirnone: 'g8',`
 */
Twinkle.speedy.getNormalizeHash = () => {
	const hash = {};
	for (const item of Twinkle.speedy.data) {
		if (item.code && item.db) {
			hash[item.db] = item.code;
		}
	}
	return hash;
};

/**
 * This is a map of Db-word templates to CSD codes such as a1. For example, `"nocontext": "a1"`
 */
Twinkle.speedy.normalizeHash = Twinkle.speedy.getNormalizeHash();

// This function is run when the CSD tab/header link is clicked
Twinkle.speedy.callback = function twinklespeedyCallback() {
	Twinkle.speedy.initDialog(Morebits.userIsSysop ? Twinkle.speedy.callback.evaluateSysop : Twinkle.speedy.callback.evaluateUser, true);
};

// Used by unlink feature
Twinkle.speedy.dialog = null;
// Used throughout
Twinkle.speedy.hasCSD = !!$('#delete-reason').length;

// Prepares the speedy deletion dialog and displays it
Twinkle.speedy.initDialog = function twinklespeedyInitDialog(callbackfunc) {
	Twinkle.speedy.dialog = new Morebits.SimpleWindow(Twinkle.getPref('speedyWindowWidth'), Twinkle.getPref('speedyWindowHeight'));
	const dialog = Twinkle.speedy.dialog;
	dialog.setTitle('Tolong pilih kriteria penghapusan cepat');
	dialog.setScriptName('Twinkle');
	dialog.addFooterLink('Kebijakan penghapusan cepat', 'WP:KPC');
	dialog.addFooterLink('Preferensi KPC', 'WP:TW/PREF#speedy');
	dialog.addFooterLink('Bantuan Twinkle', 'WP:TW/DOC#speedy');
	dialog.addFooterLink('Berikan umpan balik', 'WT:TW');

	const form = new Morebits.QuickForm(callbackfunc, Twinkle.getPref('speedySelectionStyle') === 'radioClick' ? 'change' : null);
	if (Morebits.userIsSysop) {
		form.append({
			type: 'checkbox',
			list: [
				{
					label: 'Tandai halaman saja, jangan hapus',
					value: 'tag_only',
					name: 'tag_only',
					tooltip: 'Jjika anda hanya ingin menandai halaman',
					checked: !(Twinkle.speedy.hasCSD || Twinkle.getPref('deleteSysopDefaultToDelete')),
					event: function(event) {
						const cForm = event.target.form;
						const cChecked = event.target.checked;
						// enable talk page checkbox
						if (cForm.talkpage) {
							cForm.talkpage.checked = !cChecked && Twinkle.getPref('deleteTalkPageOnDelete');
						}
						// enable redirects checkbox
						cForm.redirects.checked = !cChecked;
						// enable delete multiple
						cForm.delmultiple.checked = false;
						// enable notify checkbox
						cForm.notify.checked = cChecked;
						// enable deletion notification checkbox
						cForm.warnusertalk.checked = !cChecked && !Twinkle.speedy.hasCSD;
						// enable multiple
						cForm.multiple.checked = false;
						// enable requesting creation protection
						cForm.salting.checked = false;

						Twinkle.speedy.callback.modeChanged(cForm);

						event.stopPropagation();
					}
				}
			]
		});

		const deleteOptions = form.append({
			type: 'div',
			name: 'delete_options'
		});
		deleteOptions.append({
			type: 'header',
			label: 'Pilihan penghapusan terkait'
		});
		if (mw.config.get('wgNamespaceNumber') % 2 === 0 && (mw.config.get('wgNamespaceNumber') !== 2 || (/\//).test(mw.config.get('wgTitle')))) { // hide option for user pages, to avoid accidentally deleting user talk page
			deleteOptions.append({
				type: 'checkbox',
				list: [
					{
						label: 'Juga hapus halaman pembicaraan',
						value: 'talkpage',
						name: 'talkpage',
						tooltip: "Pilihan ini menghapus halaman pembciaraan halaman. Jika anda memilih kriteria B8 (pindah ke Commons), opsi ini akan dibiarkan dan halaman pembicaraan *tidak* dihapus.",
						checked: Twinkle.getPref('deleteTalkPageOnDelete'),
						event: function(event) {
							event.stopPropagation();
						}
					}
				]
			});
		}
		deleteOptions.append({
			type: 'checkbox',
			list: [
				{
					label: 'Juga hapus semua pengalihan',
					value: 'redirects',
					name: 'redirects',
					tooltip: 'Opsi ini akan menghapus semua pengalihan yang masuk sebagai tambahan. Hindari ini untuk penghapusan prosedural (mis. pindah/gabung).',
					checked: Twinkle.getPref('deleteRedirectsOnDelete'),
					event: function (event) {
						event.stopPropagation();
					}
				},
				{
					label: 'Hapus dengan beberapa kriteria',
					value: 'delmultiple',
					name: 'delmultiple',
					tooltip: 'Saat dipilih, anda dapat memilih beberapa kriteria untuk dipasang di halaman. Sebagai contoh, U11 dan A7 merupakan kombinasi umum untuk artikel.',
					event: function(event) {
						Twinkle.speedy.callback.modeChanged(event.target.form);
						event.stopPropagation();
					}
				},
				{
					label: 'Beritahu pembuat halaman untuk penghapusan halaman',
					value: 'warnusertalk',
					name: 'warnusertalk',
					tooltip: 'Notifikasi templat akan ditempatkan di halaman pembicaraan pembuat halaman, JIKA anda mengaktifkan notifikasi di preferensi Twinkle anda ',
					checked: !Twinkle.speedy.hasCSD,
					event: function(event) {
						event.stopPropagation();
					}
				}
			]
		});
	}

	const tagOptions = form.append({
		type: 'div',
		name: 'tag_options'
	});

	if (Morebits.userIsSysop) {
		tagOptions.append({
			type: 'header',
			label: 'Opsi terkait tag'
		});
	}

	tagOptions.append({
		type: 'checkbox',
		list: [
			{
				label: 'Beritahu ',
				value: 'notify',
				name: 'notify',
				tooltip: 'Templat notifikasi akan ditempatkan dalam halaman pembicaraan pembuat, JIKA notifikasi anda diaktifkan di preferensi Twinkle anda ',
				checked: !Morebits.userIsSysop || !(Twinkle.speedy.hasCSD || Twinkle.getPref('deleteSysopDefaultToDelete')),
				event: function(event) {
					event.stopPropagation();
				}
			},
			{
				label: 'Tag untuk proteksi pembuatan (salting) juga',
				value: 'salting',
				name: 'salting',
				tooltip: 'Saat dipilih, tag penghapusan cepat akan bersama permintaan tag {{salt}} yang menghapus perlindungan pembuatan pengurus. Hanya pilih ini jika sudah dibuat berulang kali.',
				event: function(event) {
					event.stopPropagation();
				}
			},
			{
				label: 'Menandai dengan beberapa kriteria with multiple criteria',
				value: 'multiple',
				name: 'multiple',
				tooltip: 'Saat dipilih, anda dapat memilih beberapa kriteria untuk dimasukan ke artikel. Sebagai contoh, B11 dan A7 merupakan kombo untuk artikel.',
				event: function(event) {
					Twinkle.speedy.callback.modeChanged(event.target.form);
					event.stopPropagation();
				}
			}
		]
	});

	form.append({
		type: 'div',
		id: 'prior-deletion-count',
		style: 'font-style: italic'
	});

	form.append({
		type: 'div',
		name: 'work_area',
		label: 'Gagal untuk memulai modul KPC. Tolong coba lagi, atau beritahu pengembang Twinkle terhadap kendala.'
	});

	if (Twinkle.getPref('speedySelectionStyle') !== 'radioClick') {
		form.append({ type: 'submit', className: 'tw-speedy-submit' }); // Renamed in modeChanged
	}

	const result = form.render();
	dialog.setContent(result);
	dialog.display();

	Twinkle.speedy.callback.modeChanged(result);

	// Check for prior deletions.  Just once, upon init
	Twinkle.speedy.callback.priorDeletionCount();
};

Twinkle.speedy.callback.modeChanged = function twinklespeedyCallbackModeChanged(form) {
	const namespace = mw.config.get('wgNamespaceNumber');

	// first figure out what mode we're in
	const mode = {
		isSysop: !!form.tag_only && !form.tag_only.checked,
		isMultiple: form.tag_only && !form.tag_only.checked ? form.delmultiple.checked : form.multiple.checked,
		isRadioClick: Twinkle.getPref('speedySelectionStyle') === 'radioClick'
	};

	if (mode.isSysop) {
		$('[name=delete_options]').show();
		$('[name=tag_options]').hide();
		$('button.tw-speedy-submit').text('Hapus halaman');
	} else {
		$('[name=delete_options]').hide();
		$('[name=tag_options]').show();
		$('button.tw-speedy-submit').text('Tandai halaman');
	}

	const work_area = new Morebits.QuickForm.Element({
		type: 'div',
		name: 'work_area'
	});

	if (mode.isMultiple && mode.isRadioClick) {
		const evaluateType = mode.isSysop ? 'evaluateSysop' : 'evaluateUser';

		work_area.append({
			type: 'div',
			label: 'Setelah memilih kriteria, klik:'
		});
		work_area.append({
			type: 'button',
			name: 'submit-multiple',
			label: mode.isSysop ? 'Hapus halaman' : 'Tandai halaman',
			event: function(event) {
				Twinkle.speedy.callback[evaluateType](event);
				event.stopPropagation();
			}
		});
	}

	const appendList = function(headerLabel, csdList) {
		work_area.append({ type: 'header', label: headerLabel });
		work_area.append({ type: mode.isMultiple ? 'checkbox' : 'radio', name: 'csd', list: Twinkle.speedy.generateCsdList(csdList, mode) });
	};

	if (mode.isSysop && !mode.isMultiple) {
		appendList('Kriteria khusus', Twinkle.speedy.customRationale);
	}

	if (namespace % 2 === 1 && namespace !== 3) {
		// show db-talk on talk pages, but not user talk pages
		appendList('Halaman pembicaraan', Twinkle.speedy.talkList);
	}

	if (!Morebits.isPageRedirect()) {
		switch (namespace) {
			case 0: // article
			case 1: // talk
				appendList('Artikel', Twinkle.speedy.articleList);
				break;

			case 2: // user
			case 3: // user talk
				appendList('Halaman pengguna', Twinkle.speedy.userList);
				break;

			case 6: // file
			case 7: // file talk
				appendList('Files', Twinkle.speedy.fileList);
				if (!mode.isSysop) {
					work_area.append({ type: 'div', label: 'Menandai untuk KPC B4 (tidak ada lisensi), B5 (berkas non-bebas tidak digunakan), B6 (tidak ada lisensi penggunaan tak bebas), dan B11 (tidak ada izin) dapat dilakukan dengan tab "DI" Twinkle.'});
				}
				break;

			case 10: // template
			case 11: // template talk
			case 828: // module
			case 829: // module talk
				appendList('Templat dan modul', Twinkle.speedy.templateList);
				break;

			case 14: // category
			case 15: // category talk
				appendList('Kategori', Twinkle.speedy.categoryList);
				break;

			default:
				break;
		}
	} else {
		if (namespace === 2 || namespace === 3) {
			appendList('Halaman pengguna', Twinkle.speedy.userList);
		}
		appendList('Pengalihan', Twinkle.speedy.redirectList);
	}

	let generalCriteria = Twinkle.speedy.generalList;

	// custom rationale lives under general criteria when tagging
	if (!mode.isSysop) {
		generalCriteria = Twinkle.speedy.customRationale.concat(generalCriteria);
	}
	appendList('Kriteria umum', generalCriteria);

	const old_area = Morebits.QuickForm.getElements(form, 'work_area')[0];
	form.replaceChild(work_area.render(), old_area);

	// if sysop, check if CSD is already on the page and fill in custom rationale
	if (mode.isSysop && Twinkle.speedy.hasCSD) {
		const customOption = $('input[name=csd][value=reason]')[0];
		if (customOption) {
			if (Twinkle.getPref('speedySelectionStyle') !== 'radioClick') {
				// force listeners to re-init
				customOption.click();
				customOption.parentNode.appendChild(customOption.subgroup);
			}
			customOption.subgroup.querySelector('input').value = decodeURIComponent($('#delete-reason').text()).replace(/\+/g, ' ');
		}
	}
};

Twinkle.speedy.callback.priorDeletionCount = function () {
	const query = {
		action: 'query',
		format: 'json',
		list: 'logevents',
		letype: 'delete',
		leaction: 'delete/delete', // Just pure page deletion, no redirect overwrites or revdel
		letitle: mw.config.get('wgPageName'),
		leprop: '', // We're just counting we don't actually care about the entries
		lelimit: 5 // A little bit goes a long way
	};

	new Morebits.wiki.Api('Memeriksa untuk penghapusan sebelumnya', query, ((apiobj) => {
		const response = apiobj.getResponse();
		const delCount = response.query.logevents.length;
		if (delCount) {
			let message = delCount + ' penghapusan sebelumnya';
			if (delCount > 1) {
				message += 's';
				if (response.continue) {
					message = 'Lebih dari ' + message;
				}

				// 3+ seems problematic
				if (delCount >= 3) {
					$('#prior-deletion-count').css('color', 'red');
				}
			}

			// Provide a link to page logs (CSD templates have one for sysops)
			const link = Morebits.htmlNode('a', '(logs)');
			link.setAttribute('href', mw.util.getUrl('Special:Log', {page: mw.config.get('wgPageName')}));
			link.setAttribute('target', '_blank');

			$('#prior-deletion-count').text(message + ' '); // Space before log link
			$('#prior-deletion-count').append(link);
		}
	})).post();
};

Twinkle.speedy.generateCsdList = function twinklespeedyGenerateCsdList(list, mode) {

	const pageNamespace = mw.config.get('wgNamespaceNumber');

	const openSubgroupHandler = function(e) {
		$(e.target.form).find('input').prop('disabled', true);
		$(e.target.form).children().css('color', 'gray');
		$(e.target).parent().css('color', 'black').find('input').prop('disabled', false);
		$(e.target).parent().find('input:text')[0].focus();
		e.stopPropagation();
	};
	const submitSubgroupHandler = function(e) {
		const evaluateType = mode.isSysop ? 'evaluateSysop' : 'evaluateUser';
		Twinkle.speedy.callback[evaluateType](e);
		e.stopPropagation();
	};

	return $.map(list, (critElement) => {
		const criterion = $.extend({}, critElement);

		if (mode.isMultiple) {
			if (criterion.hideWhenMultiple) {
				return null;
			}
			if (criterion.hideSubgroupWhenMultiple) {
				criterion.subgroup = null;
			}
		} else {
			if (criterion.hideWhenSingle) {
				return null;
			}
			if (criterion.hideSubgroupWhenSingle) {
				criterion.subgroup = null;
			}
		}

		if (mode.isSysop) {
			if (criterion.hideWhenSysop) {
				return null;
			}
			if (criterion.hideSubgroupWhenSysop) {
				criterion.subgroup = null;
			}
		} else {
			if (criterion.hideWhenUser) {
				return null;
			}
			if (criterion.hideSubgroupWhenUser) {
				criterion.subgroup = null;
			}
		}

		if (Morebits.isPageRedirect() && criterion.hideWhenRedirect) {
			return null;
		}

		if (criterion.showInNamespaces && !criterion.showInNamespaces.includes(pageNamespace)) {
			return null;
		}
		if (criterion.hideInNamespaces && criterion.hideInNamespaces.includes(pageNamespace)) {
			return null;
		}

		if (criterion.subgroup && !mode.isMultiple && mode.isRadioClick) {
			if (Array.isArray(criterion.subgroup)) {
				criterion.subgroup = criterion.subgroup.concat({
					type: 'button',
					name: 'submit',
					label: mode.isSysop ? 'Hapus halaman' : 'Tandai halaman',
					event: submitSubgroupHandler
				});
			} else {
				criterion.subgroup = [
					criterion.subgroup,
					{
						type: 'button',
						name: 'submit', // ends up being called "csd.submit" so this is OK
						label: mode.isSysop ? 'Hapus halaman' : 'Tandai halaman',
						event: submitSubgroupHandler
					}
				];
			}
			// FIXME: does this do anything?
			criterion.event = openSubgroupHandler;
		}

		return criterion;
	});
};

Twinkle.speedy.callbacks = {
	getTemplateCodeAndParams: function(params) {
		let code, parameters, i;
		if (params.normalizeds.length > 1) {
			code = '{{db-multiple';
			params.utparams = {};
			$.each(params.normalizeds, (index, norm) => {
				code += '|' + norm.toUpperCase();
				parameters = params.templateParams[index] || [];
				for (const i in parameters) {
					if (typeof parameters[i] === 'string' && !parseInt(i, 10)) { // skip numeric parameters - {{db-multiple}} doesn't understand them
						code += '|' + i + '=' + parameters[i];
					}
				}
				$.extend(params.utparams, Twinkle.speedy.getUserTalkParameters(norm, parameters));
			});
			code += '}}';
		} else {
			parameters = params.templateParams[0] || [];
			code = '{{db-' + params.values[0];
			for (i in parameters) {
				if (typeof parameters[i] === 'string') {
					code += '|' + i + '=' + parameters[i];
				}
			}
			if (params.usertalk) {
				code += '|help=off';
			}
			code += '}}';
			params.utparams = Twinkle.speedy.getUserTalkParameters(params.normalizeds[0], parameters);
		}

		return [code, params.utparams];
	},

	parseWikitext: function(wikitext, callback) {
		const query = {
			action: 'parse',
			prop: 'text',
			pst: 'true',
			text: wikitext,
			contentmodel: 'wikitext',
			title: mw.config.get('wgPageName'),
			disablelimitreport: true,
			format: 'json'
		};

		const statusIndicator = new Morebits.Status('Membuat ringkasan penghapusan');
		const api = new Morebits.wiki.Api('Mengambil templat penghapusan', query, ((apiobj) => {
			const reason = decodeURIComponent($(apiobj.getResponse().parse.text).find('#delete-reason').text()).replace(/\+/g, ' ');
			if (!reason) {
				statusIndicator.warn('Tidak dapat membuat ringkasan dari templat penghapusan');
			} else {
				statusIndicator.info('complete');
			}
			callback(reason);
		}), statusIndicator);
		api.post();
	},

	noteToCreator: function(pageobj) {
		const params = pageobj.getCallbackParameters();
		let initialContrib = pageobj.getCreator();

		// disallow notifying yourself
		if (initialContrib === mw.config.get('wgUserName')) {
			Morebits.Status.warn('Anda (' + initialContrib + ') membuat halaman ini; melewati notifikasi pengguna');
			initialContrib = null;

		// don't notify users when their user talk page is nominated/deleted
		} else if (initialContrib === mw.config.get('wgTitle') && mw.config.get('wgNamespaceNumber') === 3) {
			Morebits.Status.warn('Memberitahu kontributor awal: pengguna ini membuat halaman pembicaraan pengguna sendiri; melewati notifikasi');
			initialContrib = null;

		// quick hack to prevent excessive unwanted notifications, per request. Should actually be configurable on recipient page...
		} else if ((initialContrib === 'Cyberbot I' || initialContrib === 'SoxBot') && params.normalizeds[0] === 'f2') {
			Morebits.Status.warn('Memberitahu kontributor awal: page created procedurally by bot; skipping notification');
			initialContrib = null;

		// Check for already existing tags
		} else if (Twinkle.speedy.hasCSD && params.warnUser && !confirm('Halamannya telah mempunyai tag penghapusan, dan pembuatnya sepertinya telah diberitahu.  Apakah anda ingin memberitahunya untuk penghapusan ini juga?')) {
			Morebits.Status.info('Memberitahu kontributor awal', 'dibatalkan oleh pengguna; melewati notifikasi..');
			initialContrib = null;
		}

		if (initialContrib) {
			const usertalkpage = new Morebits.wiki.Page('Pembicaraan pengguna:' + initialContrib, 'Memberitahu penyunting awal (' + initialContrib + ')');
			let notifytext, i, editsummary;

			// special cases: "db" and "db-multiple"
			if (params.normalizeds.length > 1) {
				notifytext = '\n{{subst:db-' + (params.warnUser ? 'deleted' : 'notice') + '-multiple|1=' + Morebits.pageNameNorm;
				let count = 2;
				$.each(params.normalizeds, (index, norm) => {
					notifytext += '|' + count++ + '=' + norm.toUpperCase();
				});
			} else if (params.normalizeds[0] === 'db') {
				notifytext = '\n{{subst:db-reason-' + (params.warnUser ? 'deleted' : 'notice') + '|1=' + Morebits.pageNameNorm;
			} else {
				notifytext = '\n{{subst:db-csd-' + (params.warnUser ? 'deleted' : 'notice') + '-custom|1=';
				if (params.values[0] === 'copypaste') {
					notifytext += params.templateParams[0].sourcepage;
				} else {
					notifytext += Morebits.pageNameNorm;
				}
				notifytext += '|2=' + params.values[0];
			}

			for (i in params.utparams) {
				if (typeof params.utparams[i] === 'string') {
					notifytext += '|' + i + '=' + params.utparams[i];
				}
			}
			notifytext += (params.welcomeuser ? '' : '|nowelcome=yes') + '}} ~~~~';

			editsummary = 'Notifikasi: penghapusan cepat' + (params.warnUser ? '' : ' nominasi');
			if (!params.normalizeds.includes('g10')) { // no article name in summary for G10 taggings
				editsummary += ' of [[:' + Morebits.pageNameNorm + ']].';
			} else {
				editsummary += ' dari halaman serangan.';
			}

			usertalkpage.setAppendText(notifytext);
			usertalkpage.setEditSummary(editsummary);
			usertalkpage.setChangeTags(Twinkle.changeTags);
			usertalkpage.setCreateOption('recreate');
			usertalkpage.setWatchlist(Twinkle.getPref('watchSpeedyUser'));
			usertalkpage.setFollowRedirect(true, false);
			usertalkpage.append(() => {
				// add this nomination to the user's userspace log, if the user has enabled it
				if (params.lognomination) {
					Twinkle.speedy.callbacks.user.addToLog(params, initialContrib);
				}
			}, () => {
				// if user could not be notified, log nomination without mentioning that notification was sent
				if (params.lognomination) {
					Twinkle.speedy.callbacks.user.addToLog(params, null);
				}
			});
		} else if (params.lognomination) {
			// log nomination even if the user notification wasn't sent
			Twinkle.speedy.callbacks.user.addToLog(params, null);
		}
	},

	sysop: {
		main: function(params) {
			let reason;
			if (!params.normalizeds.length && params.normalizeds[0] === 'db') {
				reason = prompt('Masukan ringkasan penghapusan digunakan, yang akan dimasukkan ke dalam catatan penghapusan:', '');
				Twinkle.speedy.callbacks.sysop.deletePage(reason, params);
			} else {
				const code = Twinkle.speedy.callbacks.getTemplateCodeAndParams(params)[0];
				Twinkle.speedy.callbacks.parseWikitext(code, (reason) => {
					if (params.promptForSummary) {
						reason = prompt('Masukan ringkasan penghapusan untuk digunakan, atau tekan OK untuk menerima ringkasan otomatis.', reason);
					}
					Twinkle.speedy.callbacks.sysop.deletePage(reason, params);
				});
			}
		},
		deletePage: function(reason, params) {
			const thispage = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'Menghapus halaman');

			if (reason === null) {
				return Morebits.Status.error('Bertanya untuk alasan', 'Penggna membatalkan');
			} else if (!reason || !reason.replace(/^\s*/, '').replace(/\s*$/, '')) {
				return Morebits.Status.error('Bertanya untuk alasan', 'Alasan untuk penghapusan tidak diberikan, atau Twinkle tidak dapat menyelesaikannya. Membatalkan.');
			}

			const deleteMain = function(callback) {
				thispage.setEditSummary(reason);
				thispage.setChangeTags(Twinkle.changeTags);
				thispage.setWatchlist(params.watch);
				thispage.deletePage(() => {
					thispage.getStatusElement().info('done');
					typeof callback === 'function' && callback();
					Twinkle.speedy.callbacks.sysop.deleteTalk(params);
				});
			};

			// look up initial contributor. If prompting user for deletion reason, just display a link.
			// Otherwise open the talk page directly
			if (params.warnUser) {
				thispage.setCallbackParameters(params);
				thispage.lookupCreation((pageobj) => {
					deleteMain(() => {
						Twinkle.speedy.callbacks.noteToCreator(pageobj);
					});
				});
			} else {
				deleteMain();
			}
		},
		deleteTalk: function(params) {
			// delete talk page
			if (params.deleteTalkPage &&
					params.normalized !== 'f8' &&
					!document.getElementById('ca-talk').classList.contains('new')) {
				const talkpage = new Morebits.wiki.Page(mw.config.get('wgFormattedNamespaces')[mw.config.get('wgNamespaceNumber') + 1] + ':' + mw.config.get('wgTitle'), 'Menghapus halaman pembicaraan');
				talkpage.setEditSummary('[[WP:KPC#U8|U8]]: Halaman pembicaraan dari halaman terhapus [[' + Morebits.pageNameNorm + ']]');
				talkpage.setChangeTags(Twinkle.changeTags);
				talkpage.deletePage();
				// this is ugly, but because of the architecture of wiki.api, it is needed
				// (otherwise success/failure messages for the previous action would be suppressed)
				window.setTimeout(() => {
					Twinkle.speedy.callbacks.sysop.deleteRedirects(params);
				}, 1800);
			} else {
				Twinkle.speedy.callbacks.sysop.deleteRedirects(params);
			}
		},
		deleteRedirects: function(params) {
			// delete redirects
			if (params.deleteRedirects) {
				const query = {
					action: 'query',
					titles: mw.config.get('wgPageName'),
					prop: 'redirects',
					rdlimit: 'max', // 500 is max for normal users, 5000 for bots and sysops
					format: 'json'
				};
				const wikipedia_api = new Morebits.wiki.Api('mengambil daftar pengalihan...', query, Twinkle.speedy.callbacks.sysop.deleteRedirectsMain,
					new Morebits.Status('Menghapus pengalihan...'));
				wikipedia_api.params = params;
				wikipedia_api.post();
			}

			// promote Unlink tool
			let $link, $bigtext;
			if (mw.config.get('wgNamespaceNumber') === 6 && params.normalized !== 'f8') {
				$link = $('<a>', {
					href: '#',
					text: 'Tekan disini untuk ke alat Unlink',
					css: { fontSize: '130%', fontWeight: 'bold' },
					click: function() {
						Morebits.wiki.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						Twinkle.unlink.callback('Menghilangkan penggunaan dari dan/atau ke berkas terhapus ' + Morebits.pageNameNorm);
					}
				});
				$bigtext = $('<span>', {
					text: 'To orphan backlinks and remove instances of file usage',
					css: { fontSize: '130%', fontWeight: 'bold' }
				});
				Morebits.Status.info($bigtext[0], $link[0]);
			} else if (params.normalized !== 'f8') {
				$link = $('<a>', {
					href: '#',
					text: 'click here to go to the Unlink tool',
					css: { fontSize: '130%', fontWeight: 'bold' },
					click: function() {
						Morebits.wiki.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						Twinkle.unlink.callback('Menghapus tautan ke halaman terhapus ' + Morebits.pageNameNorm);
					}
				});
				$bigtext = $('<span>', {
					text: 'Ke pranala balik yatim',
					css: { fontSize: '130%', fontWeight: 'bold' }
				});
				Morebits.Status.info($bigtext[0], $link[0]);
			}
		},
		deleteRedirectsMain: function(apiobj) {
			const response = apiobj.getResponse();
			const snapshot = response.query.pages[0].redirects || [];
			const total = snapshot.length;
			const statusIndicator = apiobj.statelem;

			if (!total) {
				statusIndicator.status('tidak ada pengalihan ditemukan');
				return;
			}

			statusIndicator.status('0%');

			let current = 0;
			const onsuccess = function(apiobjInner) {
				const now = parseInt(100 * ++current / total, 10) + '%';
				statusIndicator.update(now);
				apiobjInner.statelem.unlink();
				if (current >= total) {
					statusIndicator.info(now + ' (selesai)');
					Morebits.wiki.removeCheckpoint();
				}
			};

			Morebits.wiki.addCheckpoint();

			snapshot.forEach((value) => {
				const title = value.title;
				const page = new Morebits.wiki.Page(title, 'Menghapus pengalihan "' + title + '"');
				page.setEditSummary('[[WP:KPC#U8|U8]]: Mengalihkan ke halaman terhapus [[' + Morebits.pageNameNorm + ']]');
				page.setChangeTags(Twinkle.changeTags);
				page.deletePage(onsuccess);
			});
		}
	},

	user: {
		main: function(pageobj) {
			const statelem = pageobj.getStatusElement();

			if (!pageobj.exists()) {
				statelem.error("Sepertinya halamannya tidak ada; mungkin sudah dihapus?");
				return;
			}

			const params = pageobj.getCallbackParameters();

			// given the params, builds the template and also adds the user talk page parameters to the params that were passed in
			// returns => [<string> wikitext, <object> utparams]
			const buildData = Twinkle.speedy.callbacks.getTemplateCodeAndParams(params);
			let code = buildData[0];
			params.utparams = buildData[1];

			// Set the correct value for |ts= parameter in {{db-g13}}
			if (params.normalizeds.includes('g13')) {
				code = code.replace('$TIMESTAMP', pageobj.getLastEditTime());
			}

			// Tag if possible, post on talk if not
			if (pageobj.canEdit() && ['wikitext', 'Scribunto', 'javascript', 'css', 'sanitized-css'].includes(pageobj.getContentModel()) && mw.config.get('wgNamespaceNumber') !== 710 /* TimedText */) {
				let text = pageobj.getPageText();

				statelem.status('Memeriksa tag di halaman...');

				// check for existing deletion tags
				const tag = /(?:\{\{\s*(db|delete|db-.*?|speedy deletion-.*?)(?:\s*\||\s*\}\}))/.exec(text);
				// This won't make use of the db-multiple template but it probably should
				if (tag && !confirm('Halaman sudah terdapat templat KPC {{' + tag[1] + '}}.  Apakah anda ingin menambahkan templat KPC lainnya?')) {
					return;
				}

				const xfd = /\{\{((?:article for deletion|proposed deletion|prod blp|template for discussion)\/dated|[cfm]fd\b)/i.exec(text) || /#invoke:(RfD)/.exec(text);
				if (xfd && !confirm('Templat penghapusan terkait {{' + xfd[1] + '}} ditemukan di halmama. Apakah anda masih ingin menambahkan templat KPC?')) {
					return;
				}

				// curate/patrol the page
				if (Twinkle.getPref('markSpeedyPagesAsPatrolled')) {
					pageobj.triage();
				}

				// Wrap SD template in noinclude tags if we are in template space.
				// Won't work with userboxes in userspace, or any other transcluded page outside template space
				if (mw.config.get('wgNamespaceNumber') === 10) { // Template:
					code = '<noinclude>' + code + '</noinclude>';
				}

				// Remove tags that become superfluous with this action
				text = text.replace(/\{\{\s*([Uu]serspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/g, '');
				if (mw.config.get('wgNamespaceNumber') === 6) {
					// remove "move to Commons" tag - deletion-tagged files cannot be moved to Commons
					text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, '');
				}

				if (params.requestsalt) {
					if (!params.normalizeds.includes('g10')) {
						code += '\n{{salt}}';
					} else {
						code = '{{salt}}\n' + code;
					}
				}

				if (mw.config.get('wgPageContentModel') === 'Scribunto') {
					// Scribunto isn't parsed like wikitext, so CSD templates on modules need special handling to work
					let equals = '';
					while (code.includes(']' + equals + ']')) {
						equals += '=';
					}
					code = "membutuhkan('Modul:Module wikitext')._addText([" + equals + '[' + code + ']' + equals + ']);';
				} else if (['javascript', 'css', 'sanitized-css'].includes(mw.config.get('wgPageContentModel'))) {
					// Likewise for JS/CSS pages
					code = '/* ' + code + ' */';
				}

				// Generate edit summary for edit
				let editsummary;
				if (params.normalizeds.length > 1) {
					editsummary = 'Meminta penghapusan cepat (';
					$.each(params.normalizeds, (index, norm) => {
						editsummary += '[[WP:KPC#' + norm.toUpperCase() + '|KPC ' + norm.toUpperCase() + ']], ';
					});
					editsummary = editsummary.substr(0, editsummary.length - 2); // remove trailing comma
					editsummary += ').';
				} else if (params.normalizeds[0] === 'db') {
					editsummary = 'Meminta [[WP:KPC|penghapusan cepat]] dengan kriteria "' + params.templateParams[0]['1'] + '".';
				} else {
					editsummary = 'Meminta penghapusan cepat ([[WP:KPC#' + params.normalizeds[0].toUpperCase() + '|KPC ' + params.normalizeds[0].toUpperCase() + ']]).';
				}

				// Blank attack pages
				if (params.normalizeds.includes('g10')) {
					text = code;
				} else {
					// Insert tag after short description or any hatnotes
					const wikipage = new Morebits.wikitext.Page(text);
					text = wikipage.insertAfterTemplates(code + '\n', Twinkle.hatnoteRegex).getText();
				}

				pageobj.setPageText(text);
				pageobj.setEditSummary(editsummary);
				pageobj.setWatchlist(params.watch);
				pageobj.save(Twinkle.speedy.callbacks.user.tagComplete);
			} else { // Attempt to place on talk page
				const talkName = new mw.Title(pageobj.getPageName()).getTalkPage().toText();
				if (talkName !== pageobj.getPageName()) {
					if (params.requestsalt) {
						code += '\n{{salt}}';
					}

					pageobj.getStatusElement().warn('Tidak dapat ke halaman penyuntingan, menaruh tag di halaman pembicaraan');

					const talk_page = new Morebits.wiki.Page(talkName, 'Menaruh secara otomatis di halaman pembicaraan');
					talk_page.setNewSectionTitle(pageobj.getPageName() + ' dinominasikan untuk KPC, meminta penghapusan');
					talk_page.setNewSectionText(code + '\n\nSaya tidak dapat menandai ' + pageobj.getPageName() + ' jadi tolong hapus. ~~~~');
					talk_page.setCreateOption('recreate');
					talk_page.setFollowRedirect(true);
					talk_page.setWatchlist(params.watch);
					talk_page.setChangeTags(Twinkle.changeTags);
					talk_page.setCallbackParameters(params);
					talk_page.newSection(Twinkle.speedy.callbacks.user.tagComplete);
				} else {
					pageobj.getStatusElement().error('Halaman tidak dapat disunting dan tidak ada lokasi lainnya untuk menempatkan permintaan, membatalkan');
				}
			}
		},

		tagComplete: function(pageobj) {
			const params = pageobj.getCallbackParameters();

			// Notification to first contributor, will also log nomination to the user's userspace log
			if (params.usertalk) {
				const thispage = new Morebits.wiki.Page(Morebits.pageNameNorm);
				thispage.setCallbackParameters(params);
				thispage.lookupCreation(Twinkle.speedy.callbacks.noteToCreator);
			// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
			} else if (params.lognomination) {
				Twinkle.speedy.callbacks.user.addToLog(params, null);
			}
		},

		addToLog: function(params, initialContrib) {
			const usl = new Morebits.UserspaceLogger(Twinkle.getPref('speedyLogPageName'));
			usl.initialText =
				"This is a log of all [[WP:CSD|speedy deletion]] nominations made by this user using [[WP:TW|Twinkle]]'s CSD module.\n\n" +
				'If you no longer wish to keep this log, you can turn it off using the [[Wikipedia:Twinkle/Preferences|preferences panel]], and ' +
				'nominate this page for speedy deletion under [[WP:CSD#U1|CSD U1]].' +
				(Morebits.userIsSysop ? '\n\nThis log does not track outright speedy deletions made using Twinkle.' : '');

			const formatParamLog = function(normalize, csdparam, input) {
				if ((normalize === 'G4' && csdparam === 'xfd') ||
					(normalize === 'G6' && csdparam === 'page') ||
					(normalize === 'G6' && csdparam === 'fullvotepage') ||
					(normalize === 'G6' && csdparam === 'sourcepage') ||
					(normalize === 'A2' && csdparam === 'source') ||
					(normalize === 'A10' && csdparam === 'article') ||
					(normalize === 'F1' && csdparam === 'filename')) {
					input = '[[:' + input + ']]';
				} else if (normalize === 'G5' && csdparam === 'user') {
					input = '[[:Pengguna:' + input + ']]';
				} else if (normalize === 'G12' && csdparam.lastIndexOf('url', 0) === 0 && input.lastIndexOf('http', 0) === 0) {
					input = '[' + input + ' ' + input + ']';
				} else if (normalize === 'F8' && csdparam === 'filename') {
					input = '[[commons:' + input + ']]';
				}
				return ' {' + normalize + ' ' + csdparam + ': ' + input + '}';
			};

			let extraInfo = '';

			// If a logged file is deleted but exists on commons, the wikilink will be blue, so provide a link to the log
			const fileLogLink = mw.config.get('wgNamespaceNumber') === 6 ? ' ([{{fullurl:Special:Log|page=' + mw.util.wikiUrlencode(mw.config.get('wgPageName')) + '}} log])' : '';

			let editsummary = 'Mencatat nominansi penghapusan cepat';
			let appendText = '# [[:' + Morebits.pageNameNorm;

			if (!params.normalizeds.includes('g10')) { // no article name in log for G10 taggings
				appendText += ']]' + fileLogLink + ': ';
				editsummary += ' dari [[:' + Morebits.pageNameNorm + ']].';
			} else {
				appendText += '|This]] attack page' + fileLogLink + ': ';
				editsummary += ' dari halaman serangan.';
			}
			if (params.normalizeds.length > 1) {
				appendText += 'multiple criteria (';
				$.each(params.normalizeds, (index, norm) => {
					appendText += '[[WP:KPC#' + norm.toUpperCase() + '|' + norm.toUpperCase() + ']], ';
				});
				appendText = appendText.substr(0, appendText.length - 2); // remove trailing comma
				appendText += ')';
			} else if (params.normalizeds[0] === 'db') {
				appendText += '{{tl|db-reason}}';
			} else {
				appendText += '[[WP:KPC#' + params.normalizeds[0].toUpperCase() + '|CSD ' + params.normalizeds[0].toUpperCase() + ']] ({{tl|db-' + params.values[0] + '}})';
			}

			// If params is "empty" it will still be full of empty arrays, but ask anyway
			if (params.templateParams) {
				// Treat custom rationale individually
				if (params.normalizeds[0] && params.normalizeds[0] === 'db') {
					extraInfo += formatParamLog('Kustom', 'rationale', params.templateParams[0]['1']);
				} else {
					params.templateParams.forEach((item, index) => {
						const keys = Object.keys(item);
						if (keys[0] !== undefined && keys[0].length > 0) {
							// Second loop required since some items (G12, F9) may have multiple keys
							keys.forEach((key, keyIndex) => {
								if (keys[keyIndex] === 'blanked' || keys[keyIndex] === 'ts') {
									return true; // Not worth logging
								}
								extraInfo += formatParamLog(params.normalizeds[index].toUpperCase(), keys[keyIndex], item[key]);
							});
						}
					});
				}
			}

			if (params.requestsalt) {
				appendText += '; meminta perlindungan pembuatan ([[WP:SALT|salting]])';
			}
			if (extraInfo) {
				appendText += '; informasi tambahan:' + extraInfo;
			}
			if (initialContrib) {
				appendText += '; {{user|1=' + initialContrib + '}} diberitahu';
			}
			appendText += ' ~~~~~\n';

			usl.changeTags = Twinkle.changeTags;
			usl.log(appendText, editsummary);
		}
	}
};

// validate subgroups in the form passed into the speedy deletion tag
Twinkle.speedy.getParameters = function twinklespeedyGetParameters(form, values) {
	let parameters = [];

	$.each(values, (index, value) => {
		const currentParams = [];
		switch (value) {
			case 'reason':
				if (form['csd.reason_1']) {
					const dbrationale = form['csd.reason_1'].value;
					if (!dbrationale || !dbrationale.trim()) {
						alert('Kriteria kustom:  Tolong berikan kriteria.');
						parameters = null;
						return false;
					}
					currentParams['1'] = dbrationale;
				}
				break;

			case 'userreq': // U1
				if (form['csd.userreq_rationale']) {
					const u1rationale = form['csd.userreq_rationale'].value;
					if (mw.config.get('wgNamespaceNumber') === 3 && !(/\//).test(mw.config.get('wgTitle')) &&
							(!u1rationale || !u1rationale.trim())) {
						alert('KPC H1: Tolong sebutkan nominasi saat menominasikan halaman pembicaraan pengguna.');
						parameters = null;
						return false;
					}
					currentParams.rationale = u1rationale;
				}
				break;

			case 'repost': // G4
				if (form['csd.repost_xfd']) {
					const deldisc = form['csd.repost_xfd'].value;
					if (deldisc) {
						currentParams.xfd = deldisc;
					}
				}
				break;

			case 'banned': // G5
				if (form['csd.banned_user'] && form['csd.banned_user'].value) {
					currentParams.user = form['csd.banned_user'].value.replace(/^\s*User:/i, '');
				}
				break;

			case 'move': // G6
				if (form['csd.move_page'] && form['csd.move_reason']) {
					const movepage = form['csd.move_page'].value,
						movereason = form['csd.move_reason'].value;
					if (!movepage || !movepage.trim()) {
						alert('KPC U6 (pindah):  Tolong sebutkan halaman untuk dipindahkan kesini.');
						parameters = null;
						return false;
					}
					if (!movereason || !movereason.trim()) {
						alert('KPC U6 (pindah):  Tolong sebutkan alasan untuk dipindahkan.');
						parameters = null;
						return false;
					}
					currentParams.page = movepage;
					currentParams.reason = movereason;
				}
				break;

			case 'xfd': // G6
				if (form['csd.xfd_fullvotepage']) {
					const xfd = form['csd.xfd_fullvotepage'].value;
					if (xfd) {
						currentParams.fullvotepage = xfd;
					}
				}
				break;

			case 'afc-move': // G6
				if (form['csd.draft_page']) {
					const draftpage = form['csd.draft_page'].value;
					if (!draftpage || !draftpage.trim()) {
						alert('KPC U6 (pindah AfC):  Tolong sebutkan draft untuk dipindahkan kesini.');
						parameters = null;
						return false;
					}
					currentParams.page = draftpage;
				}
				break;

			case 'copypaste': // G6
				if (form['csd.copypaste_sourcepage']) {
					const copypaste = form['csd.copypaste_sourcepage'].value;
					if (!copypaste || !copypaste.trim()) {
						alert('KPC U6 (salin-tempel):  Tolong berikan sumber nama halaman.');
						parameters = null;
						return false;
					}
					currentParams.sourcepage = copypaste;
				}
				break;

			case 'g6': // G6
				if (form['csd.g6_rationale'] && form['csd.g6_rationale'].value) {
					currentParams.rationale = form['csd.g6_rationale'].value;
				}
				break;

			case 'author': // G7
				if (form['csd.author_rationale'] && form['csd.author_rationale'].value) {
					currentParams.rationale = form['csd.author_rationale'].value;
				}
				break;

			case 'g8': // G8
				if (form['csd.g8_rationale'] && form['csd.g8_rationale'].value) {
					currentParams.rationale = form['csd.g8_rationale'].value;
				}
				break;

			case 'attack': // G10
				currentParams.blanked = 'yes';
				// it is actually blanked elsewhere in code, but setting the flag here
				break;

			case 'copyvio': // G12
				if (form['csd.copyvio_url'] && form['csd.copyvio_url'].value) {
					currentParams.url = form['csd.copyvio_url'].value;
				}
				if (form['csd.copyvio_url2'] && form['csd.copyvio_url2'].value) {
					currentParams.url2 = form['csd.copyvio_url2'].value;
				}
				if (form['csd.copyvio_url3'] && form['csd.copyvio_url3'].value) {
					currentParams.url3 = form['csd.copyvio_url3'].value;
				}
				break;

			case 'afc': // G13
				if (form['csd.g13_rationale'] && form['csd.g13_rationale'].value) {
					currentParams.rationale = form['csd.g13_rationale'].value;
				} // to be replaced by the last revision timestamp when page is saved
				break;

			case 'llm': // G15
				if ( form['csd.subcriteria'] && form['csd.subcriteria'].value) {
					if (form['csd.subcriteria'].value === 'communication') {
						currentParams.communication = 'yes';
					} else if (form['csd.subcriteria'].value === 'nonsensical' || form['csd.subcriteria'].value === 'implausible') {
						currentParams.references = 'yes';
						if ( form['csd.subcriteria'].value === 'nonsensical' ) {
							currentParams.reason = 'Nonsensical references';
						} else {
							currentParams.reason = 'Implausible references';
						}

						if (form['csd.reason'] && form['csd.reason'].value) {
							currentParams.reason += ': ' + form['csd.reason'].value;
						}
					}
				}

				if (form['csd.reason'] && form['csd.reason'].value && !(form['csd.subcriteria'] && form['csd.subcriteria'].value)) {
					currentParams.reason = form['csd.reason'].value;
				}
				break;

			case 'redundantimage': // F1
				if (form['csd.redundantimage_filename']) {
					const redimage = form['csd.redundantimage_filename'].value;
					if (!redimage || !redimage.trim()) {
						alert('KPC B1:  Tolong berikan nama berkas dari berkas lainnya.');
						parameters = null;
						return false;
					}
					currentParams.filename = new RegExp('^\\s*' + Morebits.namespaceRegex(6) + ':', 'i').test(redimage) ? redimage : 'File:' + redimage;
				}
				break;

			case 'badfairuse': // F7
				if (form['csd.badfairuse_rationale'] && form['csd.badfairuse_rationale'].value) {
					currentParams.rationale = form['csd.badfairuse_rationale'].value;
				}
				break;

			case 'commons': // F8
				if (form['csd.commons_filename']) {
					const filename = form['csd.commons_filename'].value;
					if (filename && filename.trim() && filename !== Morebits.pageNameNorm) {
						currentParams.filename = new RegExp('^\\s*' + Morebits.namespaceRegex(6) + ':', 'i').test(filename) ? filename : 'File:' + filename;
					}
				}
				break;

			case 'imgcopyvio': // F9
				if (form['csd.imgcopyvio_url'] && form['csd.imgcopyvio_rationale']) {
					const f9url = form['csd.imgcopyvio_url'].value;
					const f9rationale = form['csd.imgcopyvio_rationale'].value;
					if ((!f9url || !f9url.trim()) && (!f9rationale || !f9rationale.trim())) {
						alert('KPC B9: Anda harus memasukan sebuah url atau alasan (atau keduanya) saat menominasikan sebuah berkas dibawah B9.');
						parameters = null;
						return false;
					}
					if (form['csd.imgcopyvio_url'].value) {
						currentParams.url = f9url;
					}
					if (form['csd.imgcopyvio_rationale'].value) {
						currentParams.rationale = f9rationale;
					}
				}
				break;

			case 'foreign': // A2
				if (form['csd.foreign_source']) {
					const foreignlink = form['csd.foreign_source'].value;
					if (!foreignlink || !foreignlink.trim()) {
						alert('KPC A2:  Tolong berikan tautan interwiki ke artikel yang merupakan salinan.');
						parameters = null;
						return false;
					}
					currentParams.source = foreignlink;
				}
				break;

			case 'a10': // A10
				if (form['csd.a10_article']) {
					const duptitle = form['csd.a10_article'].value;
					if (!duptitle || !duptitle.trim()) {
						alert('KPC A10:  Tolong berikan nama artikel duplikat.');
						parameters = null;
						return false;
					}
					currentParams.article = duptitle;
				}
				break;

			case 'c4': // C4
				if (form['csd.c4_rationale'] && form['csd.c4_rationale'].value) {
					currentParams.rationale = form['csd.c4_rationale'].value;
				}
				break;

			default:
				break;
		}
		parameters.push(currentParams);
	});
	return parameters;
};

// Function for processing talk page notification template parameters
// key1/value1: for {{db-criterion-[notice|deleted]}} (via {{db-csd-[notice|deleted]-custom}})
// utparams.param: for {{db-[notice|deleted]-multiple}}
Twinkle.speedy.getUserTalkParameters = function twinklespeedyGetUserTalkParameters(normalized, parameters) {
	const utparams = [];

	// Special cases
	if (normalized === 'db') {
		utparams['2'] = parameters['1'];
	} else if (normalized === 'g6') {
		utparams.key1 = 'to';
		utparams.value1 = Morebits.pageNameNorm;
	} else if (normalized === 'g12') {
		['url', 'url2', 'url3'].forEach((item, idx) => {
			if (parameters[item]) {
				idx++;
				utparams['key' + idx] = item;
				utparams['value' + idx] = utparams[item] = parameters[item];
			}
		});
	} else {
		// Handle the rest
		let param;
		switch (normalized) {
			case 'g4':
				param = 'xfd';
				break;
			case 'a2':
				param = 'source';
				break;
			case 'a10':
				param = 'article';
				break;
			case 'f9':
				param = 'url';
				break;
			default:
				break;
		}
		// No harm in providing a usertalk template with the others' parameters
		if (param && parameters[param]) {
			utparams.key1 = param;
			utparams.value1 = utparams[param] = parameters[param];
		}
	}
	return utparams;
};

/**
 * @param {Event} e
 * @return {Array}
 */
Twinkle.speedy.resolveCsdValues = function twinklespeedyResolveCsdValues(e) {
	const values = (e.target.form ? e.target.form : e.target).getChecked('csd');
	if (values.length === 0) {
		alert('Tolong pilih kriteria!');
		return null;
	}
	return values;
};

Twinkle.speedy.callback.evaluateSysop = function twinklespeedyCallbackEvaluateSysop(e) {
	const form = e.target.form ? e.target.form : e.target;

	if (e.target.type === 'checkbox' || e.target.type === 'text' ||
			e.target.type === 'select') {
		return;
	}

	const tag_only = form.tag_only;
	if (tag_only && tag_only.checked) {
		Twinkle.speedy.callback.evaluateUser(e);
		return;
	}

	const values = Twinkle.speedy.resolveCsdValues(e);
	if (!values) {
		return;
	}
	const templateParams = Twinkle.speedy.getParameters(form, values);
	if (!templateParams) {
		return;
	}

	const normalizeds = values.map((value) => Twinkle.speedy.normalizeHash[value]);

	// analyse each criterion to determine whether to watch the page, prompt for summary, or notify the creator
	let watchPage, promptForSummary;
	normalizeds.forEach((norm) => {
		if (Twinkle.getPref('watchSpeedyPages').includes(norm)) {
			watchPage = Twinkle.getPref('watchSpeedyExpiry');
		}
		if (Twinkle.getPref('promptForSpeedyDeletionSummary').includes(norm)) {
			promptForSummary = true;
		}
	});

	const warnusertalk = form.warnusertalk.checked && normalizeds.some((norm, index) => Twinkle.getPref('warnUserOnSpeedyDelete').includes(norm) &&
			!(norm === 'g6' && values[index] !== 'copypaste'));

	const welcomeuser = warnusertalk && normalizeds.some((norm) => Twinkle.getPref('welcomeUserOnSpeedyDeletionNotification').includes(norm));

	const params = {
		values: values,
		normalizeds: normalizeds,
		watch: watchPage,
		deleteTalkPage: form.talkpage && form.talkpage.checked,
		deleteRedirects: form.redirects.checked,
		warnUser: warnusertalk,
		welcomeuser: welcomeuser,
		promptForSummary: promptForSummary,
		templateParams: templateParams
	};

	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(form);

	Twinkle.speedy.callbacks.sysop.main(params);
};

Twinkle.speedy.callback.evaluateUser = function twinklespeedyCallbackEvaluateUser(e) {
	const form = e.target.form ? e.target.form : e.target;

	if (e.target.type === 'checkbox' || e.target.type === 'text' ||
			e.target.type === 'select') {
		return;
	}

	const values = Twinkle.speedy.resolveCsdValues(e);
	if (!values) {
		return;
	}
	const templateParams = Twinkle.speedy.getParameters(form, values);
	if (!templateParams) {
		return;
	}

	// var multiple = form.multiple.checked;

	const normalizeds = values.map((value) => Twinkle.speedy.normalizeHash[value]);

	// analyse each criterion to determine whether to watch the page/notify the creator
	const watchPage = normalizeds.some((csdCriteria) => Twinkle.getPref('watchSpeedyPages').includes(csdCriteria)) && Twinkle.getPref('watchSpeedyExpiry');

	const notifyuser = form.notify.checked && normalizeds.some((norm, index) => Twinkle.getPref('notifyUserOnSpeedyDeletionNomination').includes(norm) &&
			!(norm === 'g6' && values[index] !== 'copypaste'));
	const welcomeuser = notifyuser && normalizeds.some((norm) => Twinkle.getPref('welcomeUserOnSpeedyDeletionNotification').includes(norm));
	const csdlog = Twinkle.getPref('logSpeedyNominations') && normalizeds.some((norm) => !Twinkle.getPref('noLogOnSpeedyNomination').includes(norm));

	const params = {
		values: values,
		normalizeds: normalizeds,
		watch: watchPage,
		usertalk: notifyuser,
		welcomeuser: welcomeuser,
		lognomination: csdlog,
		requestsalt: form.salting.checked,
		templateParams: templateParams
	};

	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(form);

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = 'Menandai selesai';

	const wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'Menandai halaman');
	wikipedia_page.setChangeTags(Twinkle.changeTags); // Here to apply to triage
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.speedy.callbacks.user.main);
};

Twinkle.addInitCallback(Twinkle.speedy, 'speedy');
}());

// </nowiki>
