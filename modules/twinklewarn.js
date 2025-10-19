// <nowiki>

(function() {

/*
 ****************************************
 *** twinklewarn.js: Warn module
 ****************************************
 * Mode of invocation:     Tab ("Warn")
 * Active on:              Any page with relevant user name (userspace, contribs,
 *                         etc.) (not IP ranges), as well as the rollback success page
 */

Twinkle.warn = function twinklewarn() {

	// Users and IPs but not IP ranges
	if (mw.config.exists('wgRelevantUserName') && !Morebits.ip.isRange(mw.config.get('wgRelevantUserName'))) {
		Twinkle.addPortletLink(Twinkle.warn.callback, 'Warn', 'tw-warn', 'Peringati/beritahu pengguna');
		if (Twinkle.getPref('autoMenuAfterRollback') &&
			mw.config.get('wgNamespaceNumber') === 3 &&
			Twinkle.getPrefill('vanarticle') &&
			!Twinkle.getPrefill('twinklewelcome') &&
			!Twinkle.getPrefill('noautowarn')) {
			Twinkle.warn.callback();
		}
	}

	// Modify URL of talk page on rollback success pages, makes use of a
	// custom message box in [[MediaWiki:Rollback-success]]
	if (mw.config.get('wgAction') === 'rollback') {
		const $vandalTalkLink = $('#mw-rollback-success').find('.mw-usertoollinks a').first();
		if ($vandalTalkLink.length) {
			$vandalTalkLink.css('font-weight', 'bold');
			$vandalTalkLink.wrapInner($('<span>').attr('title', 'Jika memungkinkan, anda dapat menggunakan Twinkle untuk memperingati suntingan mereka di halaman pembicaraan.'));

			// Can't provide vanarticlerevid as only wgCurRevisionId is provided
			const extraParam = 'vanarticle=' + mw.util.rawurlencode(Morebits.pageNameNorm);
			const href = $vandalTalkLink.attr('href');
			if (!href.includes('?')) {
				$vandalTalkLink.attr('href', href + '?' + extraParam);
			} else {
				$vandalTalkLink.attr('href', href + '&' + extraParam);
			}
		}
	}
};

// Used to close window when switching to ARV in autolevel
Twinkle.warn.dialog = null;

Twinkle.warn.callback = function twinklewarnCallback() {
	if (mw.config.get('wgRelevantUserName') === mw.config.get('wgUserName') &&
		!confirm('Anda akan memperingatkan diri sendiri! Apakah Anda yakin ingin melanjutkan??')) {
		return;
	}

	Twinkle.warn.dialog = new Morebits.SimpleWindow(600, 440);
	const dialog = Twinkle.warn.dialog;
	dialog.setTitle('Peringati/beritahu pengguna');
	dialog.setScriptName('Twinkle');
	dialog.addFooterLink('Memlilih sebuah tingkat peringatan', 'WP:UWUL#Levels');
	dialog.addFooterLink('Preferensi peringatan', 'WP:TW/PREF#warn');
	dialog.addFooterLink('Bantuan Twinkle', 'WP:TW/DOC#warn');
	dialog.addFooterLink('Berikan ulasan', 'WT:TW');

	const form = new Morebits.QuickForm(Twinkle.warn.callback.evaluate);
	const main_select = form.append({
		type: 'field',
		label: 'Pilih jenis peringatan/pemberitahuan untuk ditampilkan',
		tooltip: 'Pilih dahulu kelompok peringatan utama, lalu peringatan spesifik untuk ditampilkan.'
	});

	const main_group = main_select.append({
		type: 'select',
		name: 'main_group',
		tooltip: 'Anda dapat mengkostumisasi pilihan default di preferensi Twinkle anda',
		event: Twinkle.warn.callback.change_category
	});

	const defaultGroup = parseInt(Twinkle.getPref('defaultWarningGroup'), 10);
	main_group.append({ type: 'option', label: 'Pemilihan tingkat otomatis (1-4)', value: 'autolevel', selected: defaultGroup === 11 });
	main_group.append({ type: 'option', label: '1: Catatan umum', value: 'level1', selected: defaultGroup === 1 });
	main_group.append({ type: 'option', label: '2: Pemberitahuan', value: 'level2', selected: defaultGroup === 2 });
	main_group.append({ type: 'option', label: '3: Peringatan', value: 'level3', selected: defaultGroup === 3 });
	main_group.append({ type: 'option', label: '4: Peringatan terakhir', value: 'level4', selected: defaultGroup === 4 });
	main_group.append({ type: 'option', label: '4im: Sekadar peringatan', value: 'level4im', selected: defaultGroup === 5 });
	if (Twinkle.getPref('combinedSingletMenus')) {
		main_group.append({ type: 'option', label: 'Pesan isu tunggal', value: 'singlecombined', selected: defaultGroup === 6 || defaultGroup === 7 });
	} else {
		main_group.append({ type: 'option', label: 'Pemberitahuan isu tunggal', value: 'singlenotice', selected: defaultGroup === 6 });
		main_group.append({ type: 'option', label: 'Peringatan isu tunggal', value: 'singlewarn', selected: defaultGroup === 7 });
	}
	if (Twinkle.getPref('customWarningList').length) {
		main_group.append({ type: 'option', label: 'Peringatan kustom', value: 'custom', selected: defaultGroup === 9 });
	}
	main_group.append({ type: 'option', label: 'Semua templat peringatan', value: 'kitchensink', selected: defaultGroup === 10 });

	main_select.append({ type: 'select', name: 'sub_grup', event: Twinkle.warn.callback.change_subcategory });

	form.append({
		type: 'input',
		name: 'article',
		label: 'Linked page',
		value: Twinkle.getPrefill('vanarticle') || '',
		tooltip: 'Sebuah halaman dapat ditautkan di dalam pemberitahuan, mungkin karena halaman tersebut merupakan halaman yang dikembalikan ke halaman tersebut yang mengirimkan pemberitahuan ini. Kosongkan jika tidak ada halaman yang akan ditautkan.'
	});

	form.append({
		type: 'div',
		label: '',
		style: 'color: red',
		id: 'twinkle-warn-warning-messages'
	});

	const more = form.append({ type: 'field', name: 'reasonGroup', label: 'Informasi peringatan' });
	more.append({ type: 'textarea', label: 'Pesan opsional:', name: 'reason', tooltip: 'Mungkin sebuah alasan, atau sebuah pembertiahuan detil harus ditambahkan' });

	const previewlink = document.createElement('a');
	$(previewlink).on('click', () => {
		Twinkle.warn.callbacks.preview(result); // |result| is defined below
	});
	previewlink.style.cursor = 'pointer';
	previewlink.textContent = 'Preview';
	more.append({ type: 'div', id: 'warningpreview', label: [ previewlink ] });
	more.append({ type: 'div', id: 'twinklewarn-previewbox', style: 'display: none' });

	more.append({ type: 'submit', label: 'Kirim' });

	var result = form.render();
	dialog.setContent(result);
	dialog.display();
	result.main_group.root = result;
	result.previewer = new Morebits.wiki.Preview($(result).find('div#twinklewarn-previewbox').last()[0]);

	// Potential notices for staleness and missed reverts
	const vanrevid = Twinkle.getPrefill('vanarticlerevid');
	if (vanrevid) {
		let message = '';
		let query = {};

		// If you tried reverting, check if *you* actually reverted
		if (!Twinkle.getPrefill('noautowarn') && Twinkle.getPrefill('vanarticle')) { // Via rollback link
			query = {
				action: 'query',
				titles: Twinkle.getPrefill('vanarticle'),
				prop: 'revisions',
				rvstartid: vanrevid,
				rvlimit: 2,
				rvdir: 'newer',
				rvprop: 'user',
				format: 'json'
			};

			new Morebits.wiki.Api('Memeriksa jika anda berhasil membalikkan halamnnya', query, ((apiobj) => {
				const rev = apiobj.getResponse().query.pages[0].revisions;
				const revertUser = rev && rev[1].user;
				if (revertUser && revertUser !== mw.config.get('wgUserName')) {
					message += ' Seseorang telah membalikan halaman dan telah memperingati penggunanya.';
					$('#twinkle-warn-warning-messages').text('Catatan:' + message);
				}
			})).post();
		}

		// Confirm edit wasn't too old for a warning
		const checkStale = function(vantimestamp) {
			const revDate = new Morebits.Date(vantimestamp);
			if (vantimestamp && revDate.isValid()) {
				if (revDate.add(24, 'hours').isBefore(new Date())) {
					message += ' Suntingan ini dibuat lebih dari 24 jam yang lalu jadi peringatannya mungkin sudah basi.';
					$('#twinkle-warn-warning-messages').text('Catatan:' + message);
				}
			}
		};

		let vantimestamp = Twinkle.getPrefill('vantimestamp');
		// If from a rollback module-based revert, no API lookup necessary
		if (vantimestamp) {
			checkStale(vantimestamp);
		} else {
			query = {
				action: 'query',
				prop: 'revisions',
				rvprop: 'timestamp',
				revids: vanrevid,
				format: 'json'
			};
			new Morebits.wiki.Api('Mengambil stempel waktu revisi', query, ((apiobj) => {
				const rev = apiobj.getResponse().query.pages[0].revisions;
				vantimestamp = rev && rev[0].timestamp;
				checkStale(vantimestamp);
			})).post();
		}
	}

	// We must init the first choice (General Note);
	const evt = document.createEvent('Event');
	evt.initEvent('change', true, true);
	result.main_group.dispatchEvent(evt);
};

// This is all the messages that might be dispatched by the code
// Each of the individual templates require the following information:
//   label (required): A short description displayed in the dialog
//   summary (required): The edit summary used. If an article name is entered, the summary is postfixed with "on [[article]]", and it is always postfixed with "."
//   suppressArticleInSummary (optional): Set to true to suppress showing the article name in the edit summary. Useful if the warning relates to attack pages, or some such.
//   hideLinkedPage (optional): Set to true to hide the "Linked page" text box. Some warning templates do not have a linked article parameter.
//   hideReason (optional): Set to true to hide the "Optional message" text box. Some warning templates do not have a reason parameter.
Twinkle.warn.messages = {
	levels: {
		'Peringatan umum': {
			'uw-vandalism': {
				level1: {
					label: 'Vandalisme',
					summary: 'Catatan: Suntingan tidak membangun'
				},
				level2: {
					label: 'Vandalisme',
					summary: 'Pemberitahuan: Suntingan tidak membangun'
				},
				level3: {
					label: 'Vandalisme',
					summary: 'Warning: Vandalisme'
				},
				level4: {
					label: 'Vandalisme',
					summary: 'Pengatan terakhir: Vandalisme'
				},
				level4im: {
					label: 'Vandalisme',
					summary: 'Sekadar peringatan: Vandalisme'
				}
			},
			'uw-disruptive': {
				level1: {
					label: 'Suntingan tidak membangun',
					summary: 'Catatan: Suntingan tidak membangun'
				},
				level2: {
					label: 'Suntingan tidak membangun',
					summary: 'Pemberitahuan: Suntingan tidak membangun'
				},
				level3: {
					label: 'Suntingan tidak membangun',
					summary: 'Warning: Suntingan tidak membangun'
				},
				level4: {
					label: 'Suntingan tidak membangun',
					summary: 'Peringatan terakhir: Suntingan tidak membangun'
				},
				level4im: {
					label: 'Suntingan tidak membangun',
					summary: 'Peringatan terakhir: Suntingan tidak membangun'
				}
			},
			'uw-test': {
				level1: {
					label: 'Suntingan uji coba',
					summary: 'Catatan: Suntingan uji coba'
				},
				level2: {
					label: 'Suntingan uji coba',
					summary: 'Pemberitahuan: Suntingan uji coba'
				},
				level3: {
					label: 'Suntingan uji coba',
					summary: 'Peringatan: Suntingan uji coba'
				},
				level4: {
					label: 'Suntingan uji coba',
					summary: 'Peringatan terakhir: Suntingan uji coba'
				},
				level4im: {
					label: 'Suntingan uji coba',
					summary: 'Peringatan terakhir: Suntingan uji coba'
				}
			},
			'uw-delete': {
				level1: {
					label: 'Menghapus konten, mengosongkan halaman',
					summary: 'Catatan: Menghapus konten, mengosongkan halaman'
				},
				level2: {
					label: 'Menghapus konten, mengosongkan halaman',
					summary: 'Pemberitahuan: Menghapus konten, mengosongkan halaman'
				},
				level3: {
					label: 'Menghapus konten, mengosongkan halaman',
					summary: 'Warning: Menghapus konten, mengosongkan halaman'
				},
				level4: {
					label: 'Menghapus konten, mengosongkan halaman',
					summary: 'Peringatan terakhir: Menghapus konten, mengosongkan halaman'
				},
				level4im: {
					label: 'Menghapus konten, mengosongkan halaman',
					summary: 'Sekadar peringatan: Menghapus konten, mengosongkan halaman'
				}
			},
			'uw-generic': {
				level4: {
					label: 'Peringatan umum (untuk templat yang tidak ada di tingkat 4)',
					summary: 'Pemberitahuan peringatan terakhir'
				}
			}
		},
		'Perilaku dalam artikel': {
			'uw-biog': {
				level1: {
					label: 'Menambahkan informasi kontroversial tanpa rujukan tentang orang yang masih hidup',
					summary: 'Catatan: Menambahkan informasi kontroversial tanpa rujukan tentang orang yang masih hidup'
				},
				level2: {
					label: 'Menambahkan informasi kontroversial tanpa rujukan tentang orang yang masih hidup',
					summary: 'Pemberitahuan: Menambahkan informasi kontroversial tanpa rujukan tentang orang yang masih hidup'
				},
				level3: {
					label: 'Menambahkan informasi fitnah/kontroversial tanpa rujukan tentang orang yang masih hidup',
					summary: 'Peringatan: Menambahkan informasi kontroversial tanpa rujukan tentang orang yang masih hidup'
				},
				level4: {
					label: 'Menambahkan informasi fitnah tanpa rujukan tentang orang yang masih hidup',
					summary: 'Peringatan terakhir: Menambahkan informasi kontroversial tanpa rujukan tentang orang yang masih hidup'
				},
				level4im: {
					label: 'Menambahkan informasi fitnah tanpa rujukan tentang orang yang masih hidup',
					summary: 'Sekadar peringatan: Menambahkan informasi kontroversial tanpa rujukan tentang orang yang masih hidup'
				}
			},
			'uw-defamatory': {
				level1: {
					label: 'Menambahkan konten yang memfitnah',
					summary: 'Catatan: Menambahkan konten yang memfitnah'
				},
				level2: {
					label: 'Menambahkan konten yang memfitnah',
					summary: 'Pemberitahuan: Menambahkan konten yang memfitnah'
				},
				level3: {
					label: 'Menambahkan konten yang memfitnah',
					summary: 'Peringatan: Menambahkan konten yang memfitnah'
				},
				level4: {
					label: 'Menambahkan konten yang memfitnah',
					summary: 'Peringatan terakhir: Menambahkan konten yang memfitnah'
				},
				level4im: {
					label: 'Menambahkan konten yang memfitnah',
					summary: 'Sekadar peringatan: Menambahkan konten yang memfitnah'
				}
			},
			'uw-error': {
				level1: {
					label: 'Menambahkan kesalahan faktual secara sengaja',
					summary: 'Catatan: Penambahan kesalahan faktual secara sengaja'
				},
				level2: {
					label: 'Menambahkan kesalahan faktual secara sengaja',
					summary: 'Pemberitahuan: Penambahan kesalahan faktual secara sengaja'
				},
				level3: {
					label: 'Menambahkan kesalahan faktual secara sengaja',
					summary: 'Peringatan: Menambahkan kesalahan faktual secara sengaja'
				},
				level4: {
					label: 'Menambahkan kesalahan faktual secara sengaja',
					summary: 'Peringatan terakhir: Menambahkan kesalahan faktual secara sengaja'
				}
			},
			'uw-genre': {
				level1: {
					label: 'Mengubah secara massal atau sering tanpa konsensus atau rujukan',
					summary: 'Catatan: Mengubah secara massal atau sering tanpa konsensus atau rujukan'
				},
				level2: {
					label: 'Mengubah secara massal atau sering tanpa konsensus atau rujukan',
					summary: 'Pemberitahuan: Mengubah secara massal atau sering tanpa konsensus atau rujukan'
				},
				level3: {
					label: 'Mengubah secara massal atau sering tanpa konsensus atau rujukan',
					summary: 'Peringatan: Mengubah secara massal atau sering tanpa konsensus atau rujukan'
				},
				level4: {
					label: 'Mengubah secara massal atau sering tanpa konsensus atau rujukan',
					summary: 'Peringatan terakhir: Mengubah secara massal atau sering tanpa konsensus atau rujukan'
				}
			},
			'uw-image': {
				level1: {
					label: 'Vandalisme terkait berkas dalam artikel',
					summary: 'Catatan: Vandalisme terkait berkas dalam artikel'
				},
				level2: {
					label: 'Vandalisme terkait berkas dalam artikel',
					summary: 'Pemberitahuan: Vandalisme terkait berkas dalam artikel'
				},
				level3: {
					label: 'Vandalisme terkait berkas dalam artikel',
					summary: 'Peringatan: Vandalisme terkait berkas dalam artikel'
				},
				level4: {
					label: 'Vandalisme terkait berkas dalam artikel',
					summary: 'Peringatan terakhir: Vandalisme terkait berkas dalam artikel'
				},
				level4im: {
					label: 'Vandalisme terkait berkas',
					summary: 'Sekadar peringatan: Vandalisme terkait berkas'
				}
			},
			'uw-joke': {
				level1: {
					label: 'Menggunakan lelucon yang tidak pantas dalam artikel',
					summary: 'Catatan: Menggunakan lelucon yang tidak pantas dalam artikel'
				},
				level2: {
					label: 'Menggunakan lelucon yang tidak pantas dalam artikel',
					summary: 'Pemberitahuan: Menggunakan lelucon yang tidak pantas dalam artikel'
				},
				level3: {
					label: 'Menggunakan lelucon yang tidak pantas dalam artikel',
					summary: 'Peringatan: Menggunakan lelucon yang tidak pantas dalam artikel'
				},
				level4: {
					label: 'Menggunakan lelucon yang tidak pantas dalam artikel',
					summary: 'Peringatan terakhir: Menggunakan lelucon yang tidak pantas dalam artikel'
				},
				level4im: {
					label: 'Menggunakan lelucon yang tidak pantas',
					summary: 'Sekadar peringatan: Menggunakan lelucon yang tidak pantas'
				}
			},
			'uw-nor': {
				level1: {
					label: 'Menambahkan riset asli, misalnya kumpulan rujukan yang belum dipublikasikan',
					summary: 'Catatan: Menambahkan riset asli, misalnya kumpulan rujukan yang belum dipublikasikan'
				},
				level2: {
					label: 'Menambahkan riset asli, misalnya kumpulan rujukan yang belum dipublikasikan',
					summary: 'Pemberitahuan: Menambahkan riset asli, misalnya kumpulan rujukan yang belum dipublikasikan'
				},
				level3: {
					label: 'Menambahkan riset asli, misalnya kumpulan rujukan yang belum dipublikasikan',
					summary: 'Peringatan: Menambahkan riset asli, misalnya kumpulan rujukan yang belum dipublikasikan'
				},
				level4: {
					label: 'Menambahkan riset asli, misalnya kumpulan rujukan yang belum dipublikasikan',
					summary: 'Peringatan terakhir: Menambahkan riset asli, misalnya kumpulan rujukan yang belum dipublikasikan'
				}
			},
			'uw-notcensored': {
				level1: {
					label: 'Menyensor materi',
					summary: 'Catatan: Menyensor materi'
				},
				level2: {
					label: 'Menyensor materi',
					summary: 'Pemberitahuan: Menyensor materi'
				},
				level3: {
					label: 'Menyensor materi',
					summary: 'Peringatan: Menyensor materi'
				}
			},
			'uw-own': {
				level1: {
					label: 'Mengklaim kepemilikan artikel',
					summary: 'Catatan: Mengklaim kepemilikan artikel'
				},
				level2: {
					label: 'Mengklaim kepemilikan artikel',
					summary: 'Pemberitahuan: Mengklaim kepemilikan artikel'
				},
				level3: {
					label: 'Mengklaim kepemilikan artikel',
					summary: 'Peringatan: Mengklaim kepemilikan artikel'
				},
				level4im: {
					label: 'Mengklaim kepemilikan artikel',
					summary: 'Sekadar peringatan: Mengklaim kepemilikan artikel'
				}
			},
			'uw-tdel': {
				level1: {
					label: 'Menghapus templat pemeliharaan',
					summary: 'Catatan: Menghapus templat pemeliharaan'
				},
				level2: {
					label: 'Menghapus templat pemeliharaan',
					summary: 'Pemberitahuan: Menghapus templat pemeliharaan'
				},
				level3: {
					label: 'Menghapus templat pemeliharaan',
					summary: 'Peringatan: Menghapus templat pemeliharaan'
				},
				level4: {
					label: 'Menghapus templat pemeliharaan',
					summary: 'Peringatan terakhir: Menghapus templat pemeliharaan'
				}
			},
			'uw-unsourced': {
				level1: {
					label: 'Menambahkan materi tanpa dikutip dengan semestinya atau tanpa rujukan',
					summary: 'Catatan: Menambahkan materi tanpa dikutip dengan semestinya atau tanpa rujukan'
				},
				level2: {
					label: 'Menambahkan materi tanpa dikutip dengan semestinya atau tanpa rujukan',
					summary: 'Pemberitahuan: Menambahkan materi tanpa dikutip dengan semestinya atau tanpa rujukan'
				},
				level3: {
					label: 'Menambahkan materi tanpa dikutip dengan semestinya atau tanpa rujukan',
					summary: 'Peringatan: Menambahkan materi tanpa dikutip dengan semestinya atau tanpa rujukan'
				},
				level4: {
					label: 'Menambahkan materi tanpa dikutip dengan semestinya atau tanpa rujukan',
					summary: 'Peringatan terakhir: Menambahkan materi tanpa dikutip dengan semestinya atau tanpa rujukan'
				}
			}
		},
		'Promosi dan spam': {
			'uw-advert': {
				level1: {
					label: 'Menggunakan Wikipedia untuk beriklan atau promosi',
					summary: 'Catatan: Menggunakan Wikipedia untuk beriklan atau promosi'
				},
				level2: {
					label: 'Menggunakan Wikipedia untuk beriklan atau promosi',
					summary: 'Pemberitahuan: Menggunakan Wikipedia untuk beriklan atau promosi'
				},
				level3: {
					label: 'Menggunakan Wikipedia untuk beriklan atau promosi',
					summary: 'Peringatan: Menggunakan Wikipedia untuk beriklan atau promosi'
				},
				level4: {
					label: 'Menggunakan Wikipedia untuk beriklan atau promosi',
					summary: 'Peringatan terakhir: Menggunakan Wikipedia untuk beriklan atau promosi'
				},
				level4im: {
					label: 'Menggunakan Wikipedia untuk beriklan atau promosi',
					summary: 'Sekadar peringatan: Menggunakan Wikipedia untuk beriklan atau promosi'
				}
			},
			'uw-npov': {
				level1: {
					label: 'Tidak berpegang pada sudut pandang netral',
					summary: 'Catatan: Tidak berpegang pada sudut pandang netral'
				},
				level2: {
					label: 'Tidak berpegang pada sudut pandang netral',
					summary: 'Pemberitahuan: Tidak berpegang pada sudut pandang netral'
				},
				level3: {
					label: 'Tidak berpegang pada sudut pandang netral',
					summary: 'Peringatan: Tidak berpegang pada sudut pandang netral'
				},
				level4: {
					label: 'Tidak berpegang pada sudut pandang netral',
					summary: 'Peringatan terakhir: Tidak berpegang pada sudut pandang netral'
				}
			},
			'uw-username|promosi': {
				level1: {
					label: 'Menggunakan nama pengguna sebagai alat promosi',
					summary: 'Catatan: Menggunakan nama pengguna sebagai alat promosi'
				},
				level2: {
					label: 'Menggunakan nama pengguna sebagai alat promosi',
					summary: 'Pemberitahuan: Menggunakan nama pengguna sebagai alat promosi'
				},
				level3: {
					label: 'Menggunakan nama pengguna sebagai alat promosi',
					summary: 'Peringatan: Menggunakan nama pengguna sebagai alat promosi'
				},
				level4: {
					label: 'Menggunakan nama pengguna sebagai alat promosi',
					summary: 'Peringatan terakhir: Menggunakan nama pengguna sebagai alat promosi'
				}
			},
			'uw-username|organisasi': {
				level1: {
					label: 'Nama pengguna organisasi',
					summary: 'Catatan: Nama pengguna sebagai alat promosi organisasi'
				},
				level2: {
					label: 'Nama pengguna organisasi',
					summary: 'Pemberitahuan: Nama pengguna sebagai alat promosi organisasi'
				},
				level3: {
					label: 'Nama pengguna organisasi',
					summary: 'Peringatan: Nama pengguna sebagai alat promosi organisasi'
				},
				level4: {
					label: 'Nama pengguna organisasi',
					summary: 'Peringatan terakhir: Nama pengguna sebagai alat promosi organisasi'
				}
			},
			'uw-paid': {
				level1: {
					label: 'Suntingan berbayar tanpa penyingkapan di bawah Ketentuan Pengunaan Wikimedia',
					summary: 'Catatan: Suntingan berbayar tanpa penyingkapan di bawah Ketentuan Pengunaan Wikimedia'
				},
				level2: {
					label: 'Suntingan berbayar tanpa penyingkapan di bawah Ketentuan Pengunaan Wikimedia',
					summary: 'Pemberitahuan: Suntingan berbayar tanpa penyingkapan di bawah Ketentuan Pengunaan Wikimedia'
				},
				level3: {
					label: 'Suntingan berbayar tanpa penyingkapan di bawah Ketentuan Pengunaan Wikimedia',
					summary: 'Peringatan: Suntingan berbayar tanpa penyingkapan di bawah Ketentuan Pengunaan Wikimedia'
				},
				level4: {
					label: 'Suntingan berbayar tanpa penyingkapan di bawah Ketentuan Pengunaan Wikimedia',
					summary: 'Peringatan terakhir: Suntingan berbayar tanpa penyingkapan di bawah Ketentuan Pengunaan Wikimedia'
				}
			},
			'uw-spam': {
				level1: {
					label: 'Menambahkan pranala luar yang tak pantas',
					summary: 'Catatan: Menambahkan pranala luar yang tak pantas'
				},
				level2: {
					label: 'Menambahkan pranala luar spam',
					summary: 'Pemberitahuan: Menambahkan pranala luar spam'
				},
				level3: {
					label: 'Menambahkan pranala luar spam',
					summary: 'Peringatan: Menambahkan pranala luar spam'
				},
				level4: {
					label: 'Menambahkan pranala luar spam',
					summary: 'Peringatan terakhir: Menambahkan pranala luar spam'
				},
				level4im: {
					label: 'Menambahkan pranala luar spam',
					summary: 'Sekadar peringatan: Menambahkan pranala luar spam'
				}
			}
		},
		'Perilaku terhadap pengguna lain': {
			'uw-agf': {
				level1: {
					label: 'Tidak mengasumsikan niat baik',
					summary: 'Catatan: Tidak mengasumsikan niat baik'
				},
				level2: {
					label: 'Tidak mengasumsikan niat baik',
					summary: 'Pemberitahuan: Tidak mengasumsikan niat baik'
				},
				level3: {
					label: 'Tidak mengasumsikan niat baik',
					summary: 'Peringatan: Tidak mengasumsikan niat baik'
				}
			},
			'uw-harass': {
				level1: {
					label: 'Penyerangan terhadap pengguna lain',
					summary: 'Catatan: Penyerangan terhadap pengguna lain'
				},
				level2: {
					label: 'Penyerangan terhadap pengguna lain',
					summary: 'Pemberitahuan: Penyerangan terhadap pengguna lain'
				},
				level3: {
					label: 'Penyerangan terhadap pengguna lain',
					summary: 'Peringatan: Penyerangan terhadap pengguna lain'
				},
				level4: {
					label: 'Penyerangan terhadap pengguna lain',
					summary: 'Peringatan terakhir: Penyerangan terhadap pengguna lain'
				},
				level4im: {
					label: 'Penyerangan terhadap pengguna lain',
					summary: 'Sekadar peringatan: Penyerangan terhadap pengguna lain'
				}
			},
			'uw-npa': {
				level1: {
					label: 'Serangan pribadi kepada penyunting spesifik',
					summary: 'Catatan: Serangan pribadi kepada penyunting spesifik'
				},
				level2: {
					label: 'Serangan pribadi kepada penyunting spesifik',
					summary: 'Pemberitahuan: Serangan pribadi kepada penyunting spesifik'
				},
				level3: {
					label: 'Serangan pribadi kepada penyunting spesifik',
					summary: 'Peringatan: Serangan pribadi kepada penyunting spesifik'
				},
				level4: {
					label: 'Serangan pribadi kepada penyunting spesifik',
					summary: 'Peringatan terakhir: Serangan pribadi kepada penyunting spesifik'
				},
				level4im: {
					label: 'Serangan pribadi kepada penyunting spesifik',
					summary: 'Sekadar peringatan: Serangan pribadi kepada penyunting spesifik'
				}
			},
			'uw-tempabuse': {
				level1: {
					label: 'Penggunaan templat dan pemblokiran tidak wajar',
					summary: 'Catatan: Penggunaan templat dan pemblokiran tidak wajar'
				},
				level2: {
					label: 'Penggunaan templat dan pemblokiran tidak wajar',
					summary: 'Pemberitahuan: Penggunaan templat dan pemblokiran tidak wajar'
				}
			}
		},
		'Penghilangan tag penghapusan': {
			'uw-afd': {
				level1: {
					label: 'Menghilangkan templat {{Afd}}',
					summary: 'Catatan: Menghilangkan templat {{Afd}}'
				},
				level2: {
					label: 'Menghilangkan templat {{Afd}}',
					summary: 'Pemberitahuan: Menghilangkan templat {{Afd}}'
				},
				level3: {
					label: 'Menghilangkan templat {{Afd}}',
					summary: 'Peringatan: Menghilangkan templat {{Afd}}'
				},
				level4: {
					label: 'Menghilangkan templat {{Afd}}',
					summary: 'Peringatan terakhir: Menghilangkan templat {{Afd}}'
				}
			},
			'uw-blpprod': {
				level1: {
					label: 'Menghilangkan templat {{Prod blp}}',
					summary: 'Catatan: Menghilangkan templat {{Prod blp}}'
				},
				level2: {
					label: 'Menghilangkan templat {{Prod blp}}',
					summary: 'Pemberitahuan: Menghilangkan templat {{Prod blp}}'
				},
				level3: {
					label: 'Menghilangkan templat {{Prod blp}}',
					summary: 'Peringatan: Menghilangkan templat {{Prod blp}}'
				},
				level4: {
					label: 'Menghilangkan templat {{Prod blp}}',
					summary: 'Peringatan terakhir: Menghilangkan templat {{Prod blp}}'
				}
			},
			'uw-idt': {
				level1: {
					label: 'Menghilangkan tag penghapusan berkas',
					summary: 'Catatan: Menghilangkan tag penghapusan berkas'
				},
				level2: {
					label: 'Menghilangkan tag penghapusan berkas',
					summary: 'Pemberitahuan: Menghilangkan tag penghapusan berkas'
				},
				level3: {
					label: 'Menghilangkan tag penghapusan berkas',
					summary: 'Peringatan: Menghilangkan tag penghapusan berkas'
				},
				level4: {
					label: 'Menghilangkan tag penghapusan berkas',
					summary: 'Peringatan terakhir: Menghilangkan tag penghapusan berkas'
				}
			},
			'uw-speedy': {
				level1: {
					label: 'Menghilangkan tag penghapusan cepat',
					summary: 'Catatan: Menghilangkan tag penghapusan cepat'
				},
				level2: {
					label: 'Menghilangkan tag penghapusan cepat',
					summary: 'Pemberitahuan: Menghilangkan tag penghapusan cepat'
				},
				level3: {
					label: 'Menghilangkan tag penghapusan cepat',
					summary: 'Peringatan: Menghilangkan tag penghapusan cepat'
				},
				level4: {
					label: 'Menghilangkan tag penghapusan cepat',
					summary: 'Peringatan terakhir: Menghilangkan tag penghapusan cepat'
				}
			}
		},
		'Lain-lain': {
			'uw-attempt': {
				level1: {
					label: 'Memicu filter penyuntingan',
					summary: 'Catatan: Memicu filter penyuntingan'
				},
				level2: {
					label: 'Memicu filter penyuntingan',
					summary: 'Pemberitahuan: Memicu filter penyuntingan'
				},
				level3: {
					label: 'Memicu filter penyuntingan',
					summary: 'Peringatan: Memicu filter penyuntingan'
				},
				level4: {
					label: 'Memicu filter penyuntingan',
					summary: 'Peringatan terakhir: Memicu filter penyuntingan'
				}
			},
			'uw-chat': {
				level1: {
					label: 'Menggunakan halaman pembicaraan sebagai forum',
					summary: 'Catatan: Menggunakan halaman pembicaraan sebagai forum'
				},
				level2: {
					label: 'Menggunakan halaman pembicaraan sebagai forum',
					summary: 'Pemberitahuan: Menggunakan halaman pembicaraan sebagai forum'
				},
				level3: {
					label: 'Menggunakan halaman pembicaraan sebagai forum',
					summary: 'Peringatan: Menggunakan halaman pembicaraan sebagai forum'
				},
				level4: {
					label: 'Menggunakan halaman pembicaraan sebagai forum',
					summary: 'Peringatan terakhir: Menggunakan halaman pembicaraan sebagai forum'
				}
			},
			'uw-create': {
				level1: {
					label: 'Membuat halaman yang tidak pantas',
					summary: 'Catatan: Membuat halaman yang tidak pantas'
				},
				level2: {
					label: 'Membuat halaman yang tidak pantas',
					summary: 'Pemberitahuan: Membuat halaman yang tidak pantas'
				},
				level3: {
					label: 'Membuat halaman yang tidak pantas',
					summary: 'Peringatan: Membuat halaman yang tidak pantas'
				},
				level4: {
					label: 'Membuat halaman yang tidak pantas',
					summary: 'Peringatan terakhir: Membuat halaman yang tidak pantas'
				},
				level4im: {
					label: 'Membuat halaman yang tidak pantas',
					summary: 'Sekadar peringatan: Membuat halaman yang tidak pantas'
				}
			},
			'uw-mos': {
				level1: {
					label: 'Pedoman gaya',
					summary: 'Catatan: Format, tanggal, bahasa, dll. (Pedoman gaya)'
				},
				level2: {
					label: 'Pedoman gaya',
					summary: 'Pemberitahuan: Format, tanggal, bahasa, dll. (Pedoman gaya)'
				},
				level3: {
					label: 'Pedoman gaya',
					summary: 'Peringatan: Format, tanggal, bahasa, dll. (Pedoman gaya)'
				},
				level4: {
					label: 'Pedoman gaya',
					summary: 'Peringatan terakhir: Format, tanggal, bahasa, dll. (Pedoman gaya)'
				}
			},
			'uw-move': {
				level1: {
					label: 'Memindahkan halaman bertentangan dengan konvensi penamaan atau konsensus',
					summary: 'Catatan: Memindahkan halaman bertentangan dengan konvensi penamaan atau konsensus'
				},
				level2: {
					label: 'Memindahkan halaman bertentangan dengan konvensi penamaan atau konsensus',
					summary: 'Pemberitahuan: Memindahkan halaman bertentangan dengan konvensi penamaan atau konsensus'
				},
				level3: {
					label: 'Memindahkan halaman bertentangan dengan konvensi penamaan atau konsensus',
					summary: 'Peringatan: Memindahkan halaman bertentangan dengan konvensi penamaan atau konsensus'
				},
				level4: {
					label: 'Memindahkan halaman bertentangan dengan konvensi penamaan atau konsensus',
					summary: 'Peringatan terakhir: Memindahkan halaman bertentangan dengan konvensi penamaan atau konsensus'
				},
				level4im: {
					label: 'Memindahkan halaman bertentangan dengan konvensi penamaan atau konsensus',
					summary: 'Sekadar peringatan: Memindahkan halaman bertentangan dengan konvensi penamaan atau konsensus'
				}
			},
			'uw-tpv': {
				level1: {
					label: 'Menyunting komentar pengguna lain di halaman pembicaraan',
					summary: 'Catatan: Menyunting komentar pengguna lain di halaman pembicaraan'
				},
				level2: {
					label: 'Menyunting komentar pengguna lain di halaman pembicaraan',
					summary: 'Pemberitahuan: Menyunting komentar pengguna lain di halaman pembicaraan'
				},
				level3: {
					label: 'Menyunting komentar pengguna lain di halaman pembicaraan',
					summary: 'Peringatan: Menyunting komentar pengguna lain di halaman pembicaraan'
				},
				level4: {
					label: 'Menyunting komentar pengguna lain di halaman pembicaraan',
					summary: 'Peringatan terakhir: Menyunting komentar pengguna lain di halaman pembicaraan'
				},
				level4im: {
					label: 'Menyunting komentar pengguna lain di halaman pembicaraan',
					summary: 'Sekadar peringatan: Menyunting komentar pengguna lain di halaman pembicaraan'
				}
			},
			'uw-upload': {
				level1: {
					label: 'Menggunggah berkas nonensiklopedis',
					summary: 'Catatan: Menggunggah berkas nonensiklopedis'
				},
				level2: {
					label: 'Menggunggah berkas nonensiklopedis',
					summary: 'Pemberitahuan: Menggunggah berkas nonensiklopedis'
				},
				level3: {
					label: 'Menggunggah berkas nonensiklopedis',
					summary: 'Peringatan: Menggunggah berkas nonensiklopedis'
				},
				level4: {
					label: 'Menggunggah berkas nonensiklopedis',
					summary: 'Peringatan terakhir: Menggunggah berkas nonensiklopedis'
				},
				level4im: {
					label: 'Menggunggah berkas nonensiklopedis',
					summary: 'Sekadar peringatan: Menggunggah berkas nonensiklopedis'
				}
			}
		}
	},

	singlenotice: {
		'uw-aiv': {
			label: 'Laporan AIV tidak benar',
			summary: 'Pemberitahuan: Laporan AIV tidak benar'
		},
		'uw-autobiography': {
			label: 'Membuat otobiografi',
			summary: 'Pemberitahuan: Pembuatan otobiografi'
		},
		'uw-badcat': {
			label: 'Menambahkan kategori yang salah',
			summary: 'Pemberitahuan: Penambahan kategori yang salah'
		},
		'uw-badlistentry': {
			label: 'Menambahkan entri yang tidak sepatutnya pada daftar',
			summary: 'Pemberitahuan: Penambahan entri yang tidak sepatutnya pada daftar'
		},
		'uw-bite': {
			label: '"Menggigit" pendatang baru',
			summary: 'Pemberitahuan: "Menggigit" pendatang baru',
			suppressArticleInSummary: true  // non-standard (user name, not article), and not necessary
		},
		'uw-coi': {
			label: 'Konflik kepentingan',
			summary: 'Pemberitahuan: Konflik kepentingan',
			heading: 'Managing a conflict of interest'
		},
		'uw-controversial': {
			label: 'Memasukkan materi kontroversial',
			summary: 'Pemberitahuan: Pemasukan materi kontroversial'
		},
		'uw-copying': {
			label: 'Menyalin teks ke halaman lain',
			summary: 'Pemberitahuan: Penyalinan teks ke halaman lain'
		},
		'uw-crystal': {
			label: 'Menambahkan informasi spekulatif atau belum dikonfirmasi',
			summary: 'Pemberitahuan: Penambahan informasi spekulatif atau belum dikonfirmasi'
		},
		'uw-c&pmove': {
			label: 'Pemindahan potong dan tempel',
			summary: 'Pemberitahuan: Pemindahan potong dan tempel'
		},
		'uw-dab': {
			label: 'Suntingan tidak benar pada halaman disambiguasi',
			summary: 'Pemberitahuan: Suntingan tidak benar pada halaman disambiguasi'
		},
		'uw-date': {
			label: 'Mengubah format tanggal secara tidak perlu',
			summary: 'Pemberitahuan: Pengubahan format tanggal secara tidak perlu'
		},
		'uw-deadlink': {
			label: 'Menghapus rujukan layak yang mengandung pranala mati',
			summary: 'Pemberitahuan: Penghapusan rujukan layak yang mengandung pranala mati'
		},
		'uw-draftfirst': {
			label: 'Merancang dalam ruang pengguna tanpa risiko penghapusan cepat',
			summary: 'Pemberitahuan: Pertimbangkan merancang artikel Anda dalam [[Bantuan:Draf ruang pengguna|ruang pengguna]]'
		},
		'uw-editsummary': {
			label: 'Tidak menggunakan ringkasan suntingan',
			summary: 'Pemberitahuan: Tidak menggunakan ringkasan suntingan'
		},
		'uw-elinbody': {
			label: 'Menambahkan pranala luar ke bagian isi artikel',
			summary: 'Pemberitahuan: Letakkan pranala pada bagian Pranala luar di akhir artikel'
		},
		'uw-english': {
			label: 'Tidak berkomunikasi dalam bahasa Indonesia',
			summary: 'Pemberitahuan: Tidak berkomunikasi dalam bahasa Indonesia'
		},
		'uw-hasty': {
			label: 'Menambahkan tag penghapusan cepat secara gegabah',
			summary: 'Pemberitahuan: Izinkan pembuat artikel memperbaikinya sebelum diberi tag hapus'
		},
		'uw-italicize': {
			label: 'Cetak miring judul buku, film, album, majalah, serial TV, dll.',
			summary: 'Pemberitahuan: Cetak miring judul buku, film, album, majalah, serial TV, dll.'
		},
		'uw-lang': {
			label: 'Pengubahan yang tidak perlu antara bahasa Inggris Amerika dan Britania',
			summary: 'Pemberitahuan: Pengubahan yang tidak perlu antara bahasa Inggris Amerika dan Britania',
			heading: 'National varieties of English'
		},
		'uw-linking': {
			label: 'Menambahkan pranala merah atau pengulangan pranala biru secara berlebihan',
			summary: 'Pemberitahuan: Penambahan pranala merah atau pengulangan pranala biru secara berlebihan'
		},
		'uw-minor': {
			label: 'Menandai suntingan kecil secara tidak benar',
			summary: 'Pemberitahuan: Penandaan suntingan kecil secara tidak benar'
		},
		'uw-notenglish': {
			label: 'Membuat artikel bukan dalam bahasa Indonesia',
			summary: 'Pemberitahuan: Pembuatan artikel bukan dalam bahasa Indonesia'
		},
		'uw-notvote': {
			label: 'Kita menggunakan konsensus, bukan pemungutan suara',
			summary: 'Pemberitahuan: Kita menggunakan konsensus, bukan pemungutan suara'
		},
		'uw-plagiarism': {
			label: 'Menyalin dari sumber domain publik tanpa atribusi',
			summary: 'Pemberitahuan: Penyalinan dari sumber domain publik tanpa atribusi'
		},
		'uw-preview': {
			label: 'Menggunakan tombol Lihat pratayang untuk menghindari kesalahan',
			summary: 'Pemberitahuan: Penggunaan tombol Lihat pratayang untuk menghindari kesalahan'
		},
		'uw-redlink': {
			label: 'Penghapusan pranala merah secara sembarangan',
			summary: 'Pemberitahuan: Hati-hati saat menghapus pranala merah'
		},
		'uw-selfrevert': {
			label: 'Mengembalikan uji coba sendiri',
			summary: 'Pemberitahuan: Pengembalian uji coba sendiri'
		},
		'uw-socialnetwork': {
			label: 'Wikipedia bukanlah jejaring sosial',
			summary: 'Pemberitahuan: Wikipedia bukanlah jejaring sosial'
		},
		'uw-sofixit': {
			label: 'Jangan ragu, Anda dapat memperbaikinya',
			summary: 'Pemberitahuan: Jangan ragu, Anda dapat memperbaikinya'
		},
		'uw-spoiler': {
			label: 'Menambahkan peringatan beberan atau menghapus beberan dari bagian terkait',
			summary: "Pemberitahuan: Jangan menghapus atau menandai kemungkinan 'beberan'"
		},
		'uw-talkinarticle': {
			label: 'Pembicaraan dalam artikel',
			summary: 'Pemberitahuan: Pembicaraan dalam artikel'
		},
		'uw-tilde': {
			label: 'Tidak menandatangani pesan',
			summary: 'Pemberitahuan: Tidak menandatangani pesan'
		},
		'uw-toppost': {
			label: 'Menulis pesan di bagian atas halaman pembicaraan',
			summary: 'Pemberitahuan: Penulisan pesan di bagian atas halaman pembicaraan'
		},
		'uw-userspace draft finish': {
			label: 'Draf ruang pengguna yang terbengkalai',
			summary: 'Pemberitahuan: Draf ruang pengguna yang terbengkalai'
		},
		'uw-vgscope': {
			label: 'Menambahkan instruksi, cara curang, atau penelusuran permainan video',
			summary: 'Pemberitahuan: Penambahan instruksi, cara curang, atau penelusuran permainan video'
		},
		'uw-warn': {
			label: 'Menggunakan templat peringatan pengguna setelah mengembalikan vandalisme',
			summary: 'Pemberitahuan: Penggunaan templat peringatan pengguna setelah mengembalikan vandalisme'
		},
		'uw-wrongsummary': {
			label: 'Ketidaksesuaian atau ketidakakuratan penggunaan ringkasan suntingan',
			summary: 'Pemberitahuan: Ketidaksesuaian atau ketidakakuratan penggunaan ringkasan suntingan'
		}
	},

	singlewarn: {
		'uw-3rr': {
			label: 'Melanggar aturan tiga kali pengembalian; lihat pula uw-ew',
			summary: 'Peringatan: Pelanggaran aturan tiga kali pengembalian'
		},
		'uw-affiliate': {
			label: 'Pemasaran afiliasi',
			summary: 'Peringatan: Pemasaran afiliasi'
		},
		'uw-agf-sock': {
			label: 'Menggunakan lebih dari satu akun (asumsikan niat baik)',
			summary: 'Peringatan: Penggunaan lebih dari satu akun'
		},
		'uw-attack': {
			label: 'Membuat halaman serangan',
			summary: 'Peringatan: Pembuatan halaman serangan',
			suppressArticleInSummary: true
		},
		'uw-botun': {
			label: 'Nama pengguna bot',
			summary: 'Peringatan: Nama pengguna bot'
		},
		'uw-canvass': {
			label: 'Penganvasan',
			summary: 'Peringatan: Penganvasan'
		},
		'uw-copyright': {
			label: 'Pelanggaran hak cipta',
			summary: 'Peringatan: Pelanggaran hak cipta'
		},
		'uw-copyright-link': {
			label: 'Pelanggaran hak cipta pranala',
			summary: 'Peringatan: Pelanggaran hak cipta pranala'
		},
		'uw-copyright-new': {
			label: 'Menautkan ke pelanggaran karya berhak cipta',
			summary: 'Peringatan: Tautan ke pelanggaran karya berhak cipta',
			heading: 'Wikipedia dan hak cipta'
		},
		'uw-copyright-remove': {
			label: 'Menghapus templat {{copyvio}} dari artikel',
			summary: 'Peringatan: Penghapusan templat {{copyvio}}'
		},
		'uw-efsummary': {
			label: 'Ringkasan suntingan memicu filter penyuntingan',
			summary: 'Pemberitahuan: Ringkasan suntingan memicu filter penyuntingan'
		},
		'uw-ew': {
			label: 'Perang suntingan (teguran keras)',
			summary: 'Peringatan: Perang suntingan'
		},
		'uw-ewsoft': {
			label: 'Perang suntingan (teguran lunak bagi pengguna baru)',
			summary: 'Pemberitahuan: Perang suntingan'
		},
		'uw-hijacking': {
			label: 'Membajak artikel',
			summary: 'Peringatan: Membajak artikel'
		},
		'uw-hoax': {
			label: 'Membuat cerita/kabar bohong',
			summary: 'Peringatan: Pembuatan cerita bohong'
		},
		'uw-legal': {
			label: 'Membuat ancaman hukum',
			summary: 'Peringatan: Pembuatan ancaman hukum'
		},
		'uw-login': {
			label: 'Menyunting setelah keluar log',
			summary: 'Pemberitahuan: Penyuntingan setelah keluar log'
		},
		'uw-multipleIPs': {
			label: 'Menggunakan lebih dari satu alamat IP',
			summary: 'Peringatan: Penggunaan lebih dari satu alamat IP'
		},
		'uw-pinfo': {
			label: 'Menambahkan info pribadi pengguna lain',
			summary: 'Peringatan: Penambahan info pribadi pengguna lain'
		},
		'uw-salt': {
			label: 'Membuat kembali artikel dalam daftar hitam judul dengan judul berbeda',
			summary: 'Peringatan: Pembuatan kembali artikel yang tidak diperkenankan dengan judul berbeda'
		},
		'uw-socksuspect': {
			label: 'Dugaan pengguna siluman',
			summary: 'Peringatan: Dugaan [[WP:SILUMAN|pengguna siluman]]'  // of User:...
		},
		'uw-upv': {
			label: 'Vandalisme halaman pengguna',
			summary: 'Peringatan: Vandalisme halaman pengguna'
		},
		'uw-username': {
			label: 'Nama pengguna tidak sesuai kebijakan',
			summary: 'Pemberitahuan: Nama pengguna tidak sesuai kebijakan',
			suppressArticleInSummary: true  // not relevant for this template
		},
		'uw-coi-username': {
			label: 'Nama pengguna tidak sesuai kebijakan, dan konflik kepentingan',
			summary: 'Pemberitahuan: Kebijakan konflik kepentingan dan nama pengguna',
			heading: 'Your username'
		},
		'uw-userpage': {
			label: 'Subhalaman atau halaman pengguna tidak sesuai kebijakan',
			summary: 'Pemberitahuan: Subhalaman atau halaman pengguna tidak sesuai kebijakan'
		}
	}
};

/**
 * Reads Twinkle.warn.messages and returns a specified template's property (such as label, summary,
 * suppressArticleInSummary, hideLinkedPage, or hideReason)
 */
Twinkle.warn.getTemplateProperty = function(templates, templateName, propertyName) {
	let result;
	const isNumberedTemplate = templateName.match(/(1|2|3|4|4im)$/);
	if (isNumberedTemplate) {
		const unNumberedTemplateName = templateName.replace(/(?:1|2|3|4|4im)$/, '');
		const level = isNumberedTemplate[0];
		const numberedWarnings = {};
		$.each(templates.levels, (key, val) => {
			$.extend(numberedWarnings, val);
		});
		$.each(numberedWarnings, (key) => {
			if (key === unNumberedTemplateName) {
				result = numberedWarnings[key]['level' + level][propertyName];
			}
		});
	}

	// Non-level templates can also end in a number. So check this for all templates.
	const otherWarnings = {};
	$.each(templates, (key, val) => {
		if (key !== 'levels') {
			$.extend(otherWarnings, val);
		}
	});
	$.each(otherWarnings, (key) => {
		if (key === templateName) {
			result = otherWarnings[key][propertyName];
		}
	});

	return result;
};

// Used repeatedly below across menu rebuilds
Twinkle.warn.prev_article = null;
Twinkle.warn.prev_reason = null;
Twinkle.warn.talkpageObj = null;

Twinkle.warn.callback.change_category = function twinklewarnCallbackChangeCategory(e) {
	const value = e.target.value;
	const sub_group = e.target.root.sub_group;
	sub_group.main_group = value;
	let old_subvalue = sub_group.value;
	let old_subvalue_re;
	if (old_subvalue) {
		if (value === 'kitchensink') { // Exact match possible in kitchensink menu
			old_subvalue_re = new RegExp(mw.util.escapeRegExp(old_subvalue));
		} else {
			old_subvalue = old_subvalue.replace(/\d*(im)?$/, '');
			old_subvalue_re = new RegExp(mw.util.escapeRegExp(old_subvalue) + '(\\d*(?:im)?)$');
		}
	}

	while (sub_group.hasChildNodes()) {
		sub_group.removeChild(sub_group.firstChild);
	}

	let selected = false;
	// worker function to create the combo box entries
	const createEntries = function(contents, container, wrapInOptgroup, val = value) {
		// level2->2, singlewarn->''; also used to distinguish the
		// scaled levels from singlenotice, singlewarn, and custom
		const level = val.replace(/^\D+/g, '');
		// due to an apparent iOS bug, we have to add an option-group to prevent truncation of text
		// (search WT:TW archives for "Problem selecting warnings on an iPhone")
		if (wrapInOptgroup && $.client.profile().platform === 'iphone') {
			let wrapperOptgroup = new Morebits.QuickForm.Element({
				type: 'optgroup',
				label: 'Templat tersedia'
			});
			wrapperOptgroup = wrapperOptgroup.render();
			container.appendChild(wrapperOptgroup);
			container = wrapperOptgroup;
		}

		$.each(contents, (itemKey, itemProperties) => {
			// Skip if the current template doesn't have a version for the current level
			if (!!level && !itemProperties[val]) {
				return;
			}
			const key = typeof itemKey === 'string' ? itemKey : itemProperties.value;
			const template = key + level;

			const elem = new Morebits.QuickForm.Element({
				type: 'option',
				label: '{{' + template + '}}: ' + (level ? itemProperties[val].label : itemProperties.label),
				value: template
			});

			// Select item best corresponding to previous selection
			if (!selected && old_subvalue && old_subvalue_re.test(template)) {
				elem.data.selected = selected = true;
			}
			const elemRendered = container.appendChild(elem.render());
			$(elemRendered).data('messageData', itemProperties);
		});
	};
	const createGroup = function(warnGroup, label, wrapInOptgroup, val) {
		wrapInOptgroup = typeof wrapInOptgroup !== 'undefined' ? wrapInOptgroup : true;
		let optgroup = new Morebits.QuickForm.Element({
			type: 'optgroup',
			label: label
		});
		optgroup = optgroup.render();
		sub_group.appendChild(optgroup);
		createEntries(warnGroup, optgroup, wrapInOptgroup, val);
	};

	switch (value) {
		case 'singlenotice':
		case 'singlewarn':
			createEntries(Twinkle.warn.messages[value], sub_group, true);
			break;
		case 'singlecombined':
			var unSortedSinglets = $.extend({}, Twinkle.warn.messages.singlenotice, Twinkle.warn.messages.singlewarn);
			var sortedSingletMessages = {};
			Object.keys(unSortedSinglets).sort().forEach((key) => {
				sortedSingletMessages[key] = unSortedSinglets[key];
			});
			createEntries(sortedSingletMessages, sub_group, true);
			break;
		case 'custom':
			createEntries(Twinkle.getPref('customWarningList'), sub_group, true);
			break;
		case 'kitchensink':
			['level1', 'level2', 'level3', 'level4', 'level4im'].forEach((lvl) => {
				$.each(Twinkle.warn.messages.levels, (levelGroupLabel, levelGroup) => {
					createGroup(levelGroup, 'Tingkat ' + lvl.slice(5) + ': ' + levelGroupLabel, true, lvl);
				});
			});
			createGroup(Twinkle.warn.messages.singlenotice, 'Pemberitahuan isu tunggal');
			createGroup(Twinkle.warn.messages.singlewarn, 'Peringatan isu tunggal');
			createGroup(Twinkle.getPref('customWarningList'), 'Peringatan kustom');
			break;
		case 'level1':
		case 'level2':
		case 'level3':
		case 'level4':
		case 'level4im':
			// Creates subgroup regardless of whether there is anything to place in it;
			// leaves "Removal of deletion tags" empty for 4im
			$.each(Twinkle.warn.messages.levels, (groupLabel, groupContents) => {
				createGroup(groupContents, groupLabel, false);
			});
			break;
		case 'autolevel':
			// Check user page to determine appropriate level
			var autolevelProc = function() {
				const wikitext = Twinkle.warn.talkpageObj.getPageText();
				// history not needed for autolevel
				const latest = Twinkle.warn.callbacks.dateProcessing(wikitext)[0];
				// Pseudo-params with only what's needed to parse the level i.e. no messageData
				const params = {
					sub_group: old_subvalue,
					article: e.target.root.article.value
				};
				const lvl = 'level' + Twinkle.warn.callbacks.autolevelParseWikitext(wikitext, params, latest)[1];

				// Identical to level1, etc. above but explicitly provides the level
				$.each(Twinkle.warn.messages.levels, (groupLabel, groupContents) => {
					createGroup(groupContents, groupLabel, false, lvl);
				});

				// Trigger subcategory change, add select menu, etc.
				Twinkle.warn.callback.postCategoryCleanup(e);
			};

			if (Twinkle.warn.talkpageObj) {
				autolevelProc();
			} else {
				const usertalk_page = new Morebits.wiki.Page('User_talk:' + mw.config.get('wgRelevantUserName'), 'Loading previous warnings');
				usertalk_page.setFollowRedirect(true, false);
				usertalk_page.load((pageobj) => {
					Twinkle.warn.talkpageObj = pageobj; // Update talkpageObj
					autolevelProc();
				}, () => {
					// Catch and warn if the talkpage can't load,
					// most likely because it's a cross-namespace redirect
					// Supersedes the typical $autolevelMessage added in autolevelParseWikitext
					const $noTalkPageNode = $('<strong>', {
						text: 'Tidak dapat memuat halaman pembicaraan pengguna; Ini mungkin pengalihan lintas ruangnama. Deteksi tingkat otomatis tidak akan berfungsi..',
						id: 'twinkle-warn-autolevel-message',
						css: {color: 'red' }
					});
					$noTalkPageNode.insertBefore($('#twinkle-warn-warning-messages'));
					// If a preview was opened while in a different mode, close it
					// Should nullify the need to catch the error in preview callback
					e.target.root.previewer.closePreview();
				});
			}
			break;
		default:
			alert('Grup peringatan tidak diketahui di twinklewarn');
			break;
	}

	// Trigger subcategory change, add select menu, etc.
	// Here because of the async load for autolevel
	if (value !== 'autolevel') {
		// reset any autolevel-specific messages while we're here
		$('#twinkle-warn-autolevel-message').remove();

		Twinkle.warn.callback.postCategoryCleanup(e);
	}
};

Twinkle.warn.callback.postCategoryCleanup = function twinklewarnCallbackPostCategoryCleanup(e) {
	// clear overridden label on article textbox
	Morebits.QuickForm.setElementTooltipVisibility(e.target.root.article, true);
	Morebits.QuickForm.resetElementLabel(e.target.root.article);
	// Trigger custom label/change on main category change
	Twinkle.warn.callback.change_subcategory(e);

	// Use select2 to make the select menu searchable
	if (!Twinkle.getPref('oldSelect')) {
		$('select[name=sub_group]')
			.select2({
				theme: 'default select2-morebits',
				width: '100%',
				matcher: Morebits.select2.matchers.optgroupFull,
				templateResult: Morebits.select2.highlightSearchMatches,
				language: {
					searching: Morebits.select2.queryInterceptor
				}
			})
			.change(Twinkle.warn.callback.change_subcategory);

		$('.select2-selection').on('keydown', Morebits.select2.autoStart).trigger('focus');

		mw.util.addCSS(
			// Increase height
			'.select2-container .select2-dropdown .select2-results > .select2-results__options { max-height: 350px; }' +

			// Reduce padding
			'.select2-results .select2-results__option { padding-top: 1px; padding-bottom: 1px; }' +
			'.select2-results .select2-results__group { padding-top: 1px; padding-bottom: 1px; } ' +

			// Adjust font size
			'.select2-container .select2-dropdown .select2-results { font-size: 13px; }' +
			'.select2-container .selection .select2-selection__rendered { font-size: 13px; }'
		);
	}
};

Twinkle.warn.callback.change_subcategory = function twinklewarnCallbackChangeSubcategory(e) {
	const selected_main_group = e.target.form.main_group.value;
	const selected_template = e.target.form.sub_group.value;

	// If template shouldn't have a linked article, hide the linked article label and text box
	const hideLinkedPage = Twinkle.warn.getTemplateProperty(Twinkle.warn.messages, selected_template, 'hideLinkedPage');
	if (hideLinkedPage) {
		e.target.form.article.value = '';
		Morebits.QuickForm.setElementVisibility(e.target.form.article.parentElement, false);
	} else {
		Morebits.QuickForm.setElementVisibility(e.target.form.article.parentElement, true);
	}

	// If template shouldn't have an optional message, hide the optional message label and text box
	const hideReason = Twinkle.warn.getTemplateProperty(Twinkle.warn.messages, selected_template, 'hideReason');
	if (hideReason) {
		e.target.form.reason.value = '';
		Morebits.QuickForm.setElementVisibility(e.target.form.reason.parentElement, false);
	} else {
		Morebits.QuickForm.setElementVisibility(e.target.form.reason.parentElement, true);
	}

	// Tags that don't take a linked article, but something else (often a username).
	// The value of each tag is the label next to the input field
	const notLinkedArticle = {
		'uw-agf-sock': 'Nama pengguna opsional dari akun lainnya (tanpa Pengguna:) ',
		'uw-bite': "Nama pengguna yang 'digigit' pengguna (tanpa Pengguna:) ",
		'uw-socksuspect': 'Nama pengguna dari pengendali akun kedua jika diketahui (tanpa Pengguna:) ',
		'uw-username': 'Pelanggaran nama pengguna karena... ',
		'uw-aiv': 'Nama pengguna opsional yang dilaporkan (tanpa Pengguna:) '
	};

	const hasLevel = ['singlenotice', 'singlewarn', 'singlecombined', 'kitchensink'].includes(selected_main_group);
	if (hasLevel) {
		if (notLinkedArticle[selected_template]) {
			if (Twinkle.warn.prev_article === null) {
				Twinkle.warn.prev_article = e.target.form.article.value;
			}
			e.target.form.article.notArticle = true;
			e.target.form.article.value = '';

			// change form labels according to the warning selected
			Morebits.QuickForm.setElementTooltipVisibility(e.target.form.article, false);
			Morebits.QuickForm.overrideElementLabel(e.target.form.article, notLinkedArticle[selected_template]);
		} else if (e.target.form.article.notArticle) {
			if (Twinkle.warn.prev_article !== null) {
				e.target.form.article.value = Twinkle.warn.prev_article;
				Twinkle.warn.prev_article = null;
			}
			e.target.form.article.notArticle = false;
			Morebits.QuickForm.setElementTooltipVisibility(e.target.form.article, true);
			Morebits.QuickForm.resetElementLabel(e.target.form.article);
		}
	}

	// add big red notice, warning users about how to use {{uw-[coi-]username}} appropriately
	$('#tw-warn-red-notice').remove();
	let $redWarning;
	if (selected_template === 'uw-username') {
		$redWarning = $("<div style='color: red;' id='tw-warn-red-notice'>harusnya{{uw-username}} <b>tidak</b> digunakan untuk pelanggaran kebijakan nama pengguna <b>secara terang-terangan</b>. " +
			"Pelanggaran terang-terangan harus dilaporkan langsung kepada UAA (melalui tab ARV Twinkle). " +
			'{{uw-username}} hanya digunakan diujung nama untuk  edge cases in order to engage in discussion with the user.</div>');
		$redWarning.insertAfter(Morebits.QuickForm.getElementLabelObject(e.target.form.reasonGroup));
	} else if (selected_template === 'uw-coi-username') {
		$redWarning = $("<div style='color: red;' id='tw-warn-red-notice'>{{uw-coi-username}} harusnya <b>tidak</b> digunakan untuk pelanggaran kebijakan nama pengguna <b>secara terang-terangan</b>. " +
			"Pelanggaran terang-terangan harus dilaporkan langsung kepada UAA (melalui tab ARV Twinkle). " +
			'{{uw-coi-username}} should only be used in edge cases in order to engage in discussion with the user.</div>');
		$redWarning.insertAfter(Morebits.QuickForm.getElementLabelObject(e.target.form.reasonGroup));
	}
};

Twinkle.warn.callbacks = {
	getWarningWikitext: function(templateName, article, reason, isCustom) {
		let text = '{{subst:' + templateName;

		// add linked article for user warnings
		if (article) {
			// c&pmove has the source as the first parameter
			if (templateName === 'uw-c&pmove') {
				text += '|to=' + article;
			} else {
				text += '|1=' + article;
			}
		}
		if (reason && !isCustom) {
			// add extra message
			if (templateName === 'uw-csd' || templateName === 'uw-probation' ||
				templateName === 'uw-userspacenoindex' || templateName === 'uw-userpage') {
				text += "|3=''" + reason + "''";
			} else {
				text += "|2=''" + reason + "''";
			}
		}
		text += '}}';

		if (reason && isCustom) {
			// we assume that custom warnings lack a {{{2}}} parameter
			text += " ''" + reason + "''";
		}

		return text + ' ~~~~';
	},
	showPreview: function(form, templatename) {
		const input = Morebits.QuickForm.getInputData(form);
		// Provided on autolevel, not otherwise
		templatename = templatename || input.sub_group;
		const linkedarticle = input.article;
		const templatetext = Twinkle.warn.callbacks.getWarningWikitext(templatename, linkedarticle,
			input.reason, input.main_group === 'custom');

		form.previewer.beginRender(templatetext, 'Pembicaraan pengguna:' + mw.config.get('wgRelevantUserName')); // Force wikitext/correct username
	},
	// Just a pass-through unless the autolevel option was selected
	preview: function(form) {
		if (form.main_group.value === 'autolevel') {
			// Always get a new, updated talkpage for autolevel processing
			const usertalk_page = new Morebits.wiki.Page('Pembicaraan pengguna:' + mw.config.get('wgRelevantUserName'), 'Memuat peringatan sebelumnya');
			usertalk_page.setFollowRedirect(true, false);
			// Will fail silently if the talk page is a cross-ns redirect,
			// removal of the preview box handled when loading the menu
			usertalk_page.load((pageobj) => {
				Twinkle.warn.talkpageObj = pageobj; // Update talkpageObj

				const wikitext = pageobj.getPageText();
				// history not needed for autolevel
				const latest = Twinkle.warn.callbacks.dateProcessing(wikitext)[0];
				const params = {
					sub_group: form.sub_group.value,
					article: form.article.value,
					messageData: $(form.sub_group).find('option[value="' + $(form.sub_group).val() + '"]').data('messageData')
				};
				const template = Twinkle.warn.callbacks.autolevelParseWikitext(wikitext, params, latest)[0];
				Twinkle.warn.callbacks.showPreview(form, template);

				// If the templates have diverged, fake a change event
				// to reload the menu with the updated pageobj
				if (form.sub_group.value !== template) {
					const evt = document.createEvent('Event');
					evt.initEvent('change', true, true);
					form.main_group.dispatchEvent(evt);
				}
			});
		} else {
			Twinkle.warn.callbacks.showPreview(form);
		}
	},
	/**
	 * Used in the main and autolevel loops to determine when to warn
	 * about excessively recent, stale, or identical warnings.
	 *
	 * @param {string} wikitext  The text of a user's talk page, from getPageText()
	 * @return {Object[]} - Array of objects: latest contains most recent
	 * warning and date; history lists all prior warnings
	 */
	dateProcessing: function(wikitext) {
		const history_re = /<!--\s?Template:([uU]w-.*?)\s?-->.*?(\d{1,2}:\d{1,2}, \d{1,2} \w+ \d{4} \(UTC\))/g;
		const history = {};
		const latest = { date: new Morebits.Date(0), type: '' };
		let current;

		while ((current = history_re.exec(wikitext)) !== null) {
			const template = current[1], current_date = new Morebits.Date(current[2]);
			if (!(template in history) || history[template].isBefore(current_date)) {
				history[template] = current_date;
			}
			if (!latest.date.isAfter(current_date)) {
				latest.date = current_date;
				latest.type = template;
			}
		}
		return [latest, history];
	},
	/**
	 * Main loop for deciding what the level should increment to. Most of
	 * this is really just error catching and updating the subsequent data.
	 * May produce up to two notices in a twinkle-warn-autolevel-messages div
	 *
	 * @param {string} wikitext  The text of a user's talk page, from getPageText() (required)
	 * @param {Object} params  Params object: sub_group is the template (required);
	 * article is the user-provided article (form.article) used to link ARV on recent level4 warnings;
	 * messageData is only necessary if getting the full template, as it's
	 * used to ensure a valid template of that level exists
	 * @param {Object} latest  First element of the array returned from
	 * dateProcessing. Provided here rather than processed within to avoid
	 * repeated call to dateProcessing
	 * @param {(Date|Morebits.Date)} date  Date from which staleness is determined
	 * @param {Morebits.Status} statelem  Status element, only used for handling error in final execution
	 *
	 * @return {Array} - Array that contains the full template and just the warning level
	 */
	autolevelParseWikitext: function(wikitext, params, latest, date, statelem) {
		let level; // undefined rather than '' means the isNaN below will return true
		if (/\d(?:im)?$/.test(latest.type)) { // level1-4im
			level = parseInt(latest.type.replace(/.*(\d)(?:im)?$/, '$1'), 10);
		} else if (latest.type) { // Non-numbered warning
			// Try to leverage existing categorization of
			// warnings, all but one are universally lowercased
			const loweredType = /uw-multipleIPs/i.test(latest.type) ? 'uw-multipleIPs' : latest.type.toLowerCase();
			// It would be nice to account for blocks, but in most
			// cases the hidden message is terminal, not the sig
			if (Twinkle.warn.messages.singlewarn[loweredType]) {
				level = 3;
			} else {
				level = 1; // singlenotice or not found
			}
		}

		const $autolevelMessage = $('<div>', {id: 'twinkle-warn-autolevel-message'});

		if (isNaN(level)) { // No prior warnings found, this is the first
			level = 1;
		} else if (level > 4 || level < 1) { // Shouldn't happen
			const message = 'Tidak dapat mengambil tingkat peringatan sebelumnya, tolong secara manual untuk memilih sebuah tingkat peringatan.';
			if (statelem) {
				statelem.error(message);
			} else {
				alert(message);
			}
			return;
		} else {
			date = date || new Date();
			const autoTimeout = new Morebits.Date(latest.date.getTime()).add(parseInt(Twinkle.getPref('autolevelStaleDays'), 10), 'days');
			if (autoTimeout.isAfter(date)) {
				if (level === 4) {
					level = 4;
					// Basically indicates whether we're in the final Main evaluation or not,
					// and thus whether we can continue or need to display the warning and link
					if (!statelem) {
						const $link = $('<a>', {
							href: '#',
							text: 'tekan disini untuk membuka alat ARV.',
							css: { fontWeight: 'bold' },
							click: function() {
								Morebits.wiki.actionCompleted.redirect = null;
								Twinkle.warn.dialog.close();
								Twinkle.arv.callback(mw.config.get('wgRelevantUserName'));
								$('input[name=page]').val(params.article); // Target page
								$('input[value=final]').prop('checked', true); // Vandalism after final
							}
						});
						const $statusNode = $('<div>', {
							text: mw.config.get('wgRelevantUserName') + ' baru saja mendapat peringatan tingkat 4 (' + latest.type + ') jadi lebih baik melaporkannya saja; ',
							css: {color: 'red' }
						});
						$statusNode.append($link[0]);
						$autolevelMessage.append($statusNode);
					}
				} else { // Automatically increase severity
					level += 1;
				}
			} else { // Reset warning level if most-recent warning is too old
				level = 1;
			}
		}

		$autolevelMessage.prepend($('<div>Akan memberikan <span style="font-weight: bold;">templat ' + level + '</span> tingkat.</div>'));
		// Place after the stale and other-user-reverted (text-only) messages
		$('#twinkle-warn-autolevel-message').remove(); // clean slate
		$autolevelMessage.insertAfter($('#twinkle-warn-warning-messages'));

		let template = params.sub_group.replace(/(.*)\d$/, '$1');
		// Validate warning level, falling back to the uw-generic series.
		// Only a few items are missing a level, and in all but a handful
		// of cases, the uw-generic series is explicitly used elsewhere per WP:UTM.
		if (params.messageData && !params.messageData['level' + level]) {
			template = 'uw-generic';
		}
		template += level;

		return [template, level];
	},
	main: function(pageobj) {
		const text = pageobj.getPageText();
		const statelem = pageobj.getStatusElement();
		const params = pageobj.getCallbackParameters();
		let messageData = params.messageData;

		const [latest, history] = Twinkle.warn.callbacks.dateProcessing(text);

		const now = new Morebits.Date(pageobj.getLoadTime());

		Twinkle.warn.talkpageObj = pageobj; // Update talkpageObj, just in case
		if (params.main_group === 'autolevel') {
			// [template, level]
			const templateAndLevel = Twinkle.warn.callbacks.autolevelParseWikitext(text, params, latest, now, statelem);

			// Only if there's a change from the prior display/load
			if (params.sub_group !== templateAndLevel[0] && !confirm('Akan memberikan templat {{' + templateAndLevel[0] + '}} ke pengguna?')) {
				statelem.error('dibatalkan atas permintaan pengguna');
				return;
			}
			// Update params now that we've selected a warning
			params.sub_group = templateAndLevel[0];
			messageData = params.messageData['level' + templateAndLevel[1]];
		} else if (params.sub_group in history) {
			if (new Morebits.Date(history[params.sub_group]).add(1, 'day').isAfter(now)) {
				if (!confirm('Sebuah' + params.sub_group + ' sama telah diberika baru-baru ini  \nAnda ingin tetap memberikan peringatan/pemberitahuan ini?')) {
					statelem.error('dibatalkan atas permintaan pengguna');
					return;
				}
			}
		}

		latest.date.add(1, 'minute'); // after long debate, one minute is max

		if (latest.date.isAfter(now)) {
			if (!confirm('Sebuah ' + latest.type + ' telah diberikan di beberapa menit ini.  \nAnda ingin tetap memberikan peringatan/pemberitahuan ini?')) {
				statelem.error('dibatalkan atas permintaan pengguna');
				return;
			}
		}

		// build the edit summary
		// Function to handle generation of summary prefix for custom templates
		const customProcess = function(template) {
			template = template.split('|')[0];
			let prefix;
			switch (template.slice(-1)) {
				case '1':
					prefix = 'General note';
					break;
				case '2':
					prefix = 'Caution';
					break;
				case '3':
					prefix = 'Warning';
					break;
				case '4':
					prefix = 'Final warning';
					break;
				case 'm':
					if (template.slice(-3) === '4im') {
						prefix = 'Only warning';
						break;
					}
					// falls through
				default:
					prefix = 'Notice';
					break;
			}
			return prefix + ': ' + Morebits.string.toUpperCaseFirstChar(messageData.label);
		};

		let summary;
		if (params.main_group === 'custom') {
			summary = customProcess(params.sub_group);
		} else {
			// Normalize kitchensink to the 1-4im style
			if (params.main_group === 'kitchensink' && !/^D+$/.test(params.sub_group)) {
				let sub = params.sub_group.slice(-1);
				if (sub === 'm') {
					sub = params.sub_group.slice(-3);
				}
				// Don't overwrite uw-3rr, technically unnecessary
				if (/\d/.test(sub)) {
					params.main_group = 'level' + sub;
				}
			}
			// singlet || level1-4im, no need to /^\D+$/.test(params.main_group)
			summary = messageData.summary || (messageData[params.main_group] && messageData[params.main_group].summary);
			// Not in Twinkle.warn.messages, assume custom template
			if (!summary) {
				summary = customProcess(params.sub_group);
			}
			if (messageData.suppressArticleInSummary !== true && params.article) {
				if (params.sub_group === 'uw-agf-sock' ||
						params.sub_group === 'uw-socksuspect' ||
						params.sub_group === 'uw-aiv') { // these templates require a username
					summary += ' dari [[:Pengguna:' + params.article + ']]';
				} else {
					summary += ' pada [[:' + params.article + ']]';
				}
			}
		}

		pageobj.setEditSummary(summary + '.');
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setWatchlist(Twinkle.getPref('watchWarnings'));

		// Get actual warning text
		let warningText = Twinkle.warn.callbacks.getWarningWikitext(params.sub_group, params.article,
			params.reason, params.main_group === 'custom');
		if (Twinkle.getPref('showSharedIPNotice') && mw.util.isIPAddress(mw.config.get('wgTitle'))) {
			Morebits.Status.info('Info', 'Menambahkan sebuah pemberitahuan IP berbagi');
			warningText += '\n{{subst:Shared IP advice}}';
		}

		let sectionExists = false, sectionNumber = 0;
		// Only check sections if there are sections or there's a chance we won't create our own
		if (!messageData.heading && text.length) {
			// Get all sections
			const sections = text.match(/^(==*).+\1/gm);
			if (sections && sections.length !== 0) {
				// Find the index of the section header in question
				const dateHeaderRegex = now.monthHeaderRegex();
				sectionNumber = 0;
				// Find this month's section among L2 sections, preferring the bottom-most
				sectionExists = sections.reverse().some((sec, idx) => /^(==)[^=].+\1/m.test(sec) && dateHeaderRegex.test(sec) && typeof (sectionNumber = sections.length - 1 - idx) === 'number');
			}
		}

		if (sectionExists) { // append to existing section
			pageobj.setPageSection(sectionNumber + 1);
			pageobj.setAppendText('\n\n' + warningText);
			pageobj.append();
		} else {
			if (messageData.heading) { // create new section
				pageobj.setNewSectionTitle(messageData.heading);
			} else {
				Morebits.Status.info('Info', 'Akan membuat sebuah bagian halaman pembicaraan baru untuk bulan ini karena baru tidak ada sebelumnya');
				pageobj.setNewSectionTitle(now.monthHeader(0));
			}
			pageobj.setNewSectionText(warningText);
			pageobj.newSection();
		}
	}
};

Twinkle.warn.callback.evaluate = function twinklewarnCallbackEvaluate(e) {
	const userTalkPage = 'Pembicaraan pengguna:' + mw.config.get('wgRelevantUserName');

	// reason, main_group, sub_group, article
	const params = Morebits.QuickForm.getInputData(e.target);

	// Check that a reason was filled in if uw-username was selected
	if (params.sub_group === 'uw-username' && !params.article) {
		alert('Anda harus menyediakan sebuah alasan untuk templat {{uw-username}}.');
		return;
	}

	// The autolevel option will already know by now if a user talk page
	// is a cross-namespace redirect (via !!Twinkle.warn.talkpageObj), so
	// technically we could alert an error here, but the user will have
	// already ignored the bold red error above.  Moreover, they probably
	// *don't* want to actually issue a warning, so the error handling
	// after the form is submitted is probably preferable

	// Find the selected <option> element so we can fetch the data structure
	const $selectedEl = $(e.target.sub_group).find('option[value="' + $(e.target.sub_group).val() + '"]');
	params.messageData = $selectedEl.data('messageData');

	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(e.target);

	Morebits.wiki.actionCompleted.redirect = userTalkPage;
	Morebits.wiki.actionCompleted.notice = 'Peringatan selesai, memuat kembali halaman pembicaraan segera';

	const wikipedia_page = new Morebits.wiki.Page(userTalkPage, 'Modifikasi halaman pembicaraan pengguna');
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.setFollowRedirect(true, false);
	wikipedia_page.load(Twinkle.warn.callbacks.main);
};

Twinkle.addInitCallback(Twinkle.warn, 'warn');
}());

// </nowiki>
