// <nowiki>

(function() {

/*
 ****************************************
 *** twinklearv.js: ARV module
 ****************************************
 * Mode of invocation:     Tab ("ARV")
 * Active on:              Any page with relevant user name (userspace, contribs, etc.)
 */

Twinkle.arv = function twinklearv() {
	const username = mw.config.get('wgRelevantUserName');
	if (!username || username === mw.config.get('wgUserName')) {
		return;
	}

	const isIP = mw.util.isIPAddress(username, true);
	// Ignore ranges wider than the CIDR limit
	if (Morebits.ip.isRange(username) && !Morebits.ip.validCIDR(username)) {
		return;
	}
	const userType = isIP ? 'IP' + (Morebits.ip.isRange(username) ? ' range' : '') : 'user';

	Twinkle.addPortletLink(() => {
		Twinkle.arv.callback(username, isIP);
	}, 'ARV', 'tw-arv', 'Laporkan ' + userType + ' ke pengurus');
};

Twinkle.arv.callback = function (uid, isIP) {
	const Window = new Morebits.SimpleWindow(600, 500);
	Window.setTitle('Pelaporan dan Pemeriksaan Lanjutan'); // Backronym
	Window.setScriptName('Twinkle');
	Window.addFooterLink('Panduan Intervensi pengurus terhadap vandalisme', 'WP:UAA');
	Window.addFooterLink('Panduan panduan nama pengguna', 'WP:UAAI');
	Window.addFooterLink('Panduan IPS', 'Wikipedia:Investigasi pengguna siluman');
	Window.addFooterLink('Preferensi ARV', 'WP:TW/PREF#arv');
	Window.addFooterLink('Bantuan Twinkle', 'WP:TW/DOC#arv');
	Window.addFooterLink('Berikan umpan balik', 'WT:TW');

	const form = new Morebits.QuickForm(Twinkle.arv.callback.evaluate);
	const categories = form.append({
		type: 'select',
		name: 'category',
		label: 'Pilih jenis laporan: ',
		event: Twinkle.arv.callback.changeCategory
	});
	categories.append({
		type: 'option',
		label: 'Vandalisme (WP:AIV)',
		value: 'aiv'
	});
	categories.append({
		type: 'option',
		label: 'Nama pengguna (WP:UAA)',
		value: 'username',
		disabled: mw.util.isIPAddress(uid)
	});
	categories.append({
		type: 'option',
		label: 'Akun boneka (induk) (WP:SPI)',
		value: 'sock'
	});
	categories.append({
		type: 'option',
		label: 'Akun boneka (WP:SPI)',
		value: 'puppet'
	});
	categories.append({
		type: 'option',
		label: 'Perang suntingan (WP:AN3)',
		value: 'an3'
	});
	form.append({
		type: 'field',
		label: 'Work area',
		name: 'work_area'
	});
	form.append({ type: 'submit' });
	form.append({
		type: 'hidden',
		name: 'uid',
		value: uid
	});

	const result = form.render();
	Window.setContent(result);
	Window.display();

	// Check if the user is blocked, update notice
	const query = {
		action: 'query',
		list: 'blocks',
		bkprop: 'range|flags',
		format: 'json'
	};
	if (isIP) {
		query.bkip = uid;
	} else {
		query.bkusers = uid;
	}
	new Morebits.wiki.Api("Memeriksa status pemblokiran pengguna", query, ((apiobj) => {
		const blocklist = apiobj.getResponse().query.blocks;
		if (blocklist.length) {
			// If an IP is blocked *and* rangeblocked, only use whichever is more recent
			const block = blocklist[0];
			let message = (isIP ? 'IP ini ' + (Morebits.ip.isRange(uid) ? 'range' : 'address') : 'Akun ini') + (block.partial ? 'parsial' : 'sudah') + ' diblokir';
			// Start and end differ, range blocked
			message += block.rangestart !== block.rangeend ? ' sebagai bagian dari pemblokiran berjarak.' : '.';
			if (block.partial) {
				$('#twinkle-arv-blockwarning').css('color', 'black'); // Less severe
			}
			$('#twinkle-arv-blockwarning').text(message);
		}
	})).post();

	// We must init the
	const evt = document.createEvent('Event');
	evt.initEvent('change', true, true);
	result.category.dispatchEvent(evt);
};

Twinkle.arv.callback.changeCategory = function (e) {
	const value = e.target.value;
	const root = e.target.form;
	const old_area = Morebits.QuickForm.getElements(root, 'work_area')[0];
	let work_area = null;

	switch (value) {
		case 'aiv':
		/* falls through */
		default:
			work_area = new Morebits.QuickForm.Element({
				type: 'field',
				label: 'Laporkan pengguna pelaku vandal',
				name: 'work_area'
			});
			work_area.append({
				type: 'input',
				name: 'page',
				label: 'Pranala ke halaman yang divandal:',
				tooltip: 'Biarkan kosong jika Anda tidak ingin menautkan ke halaman dalam laporan',
				value: Twinkle.getPrefill('vanarticle') || '',
				event: function(e) {
					const value = e.target.value;
					const root = e.target.form;
					if (value === '') {
						root.badid.disabled = root.goodid.disabled = true;
					} else {
						root.badid.disabled = false;
						root.goodid.disabled = root.badid.value === '';
					}
				}
			});
			work_area.append({
				type: 'input',
				name: 'badid',
				label: 'ID revisi untuk halaman target ketika divandal:',
				tooltip: 'Biarkan kosong jika tidak ada tautan diff',
				value: Twinkle.getPrefill('vanarticlerevid') || '',
				disabled: !Twinkle.getPrefill('vanarticle'),
				event: function(e) {
					const value = e.target.value;
					const root = e.target.form;
					root.goodid.disabled = value === '';
				}
			});
			work_area.append({
				type: 'input',
				name: 'goodid',
				label: 'ID revisi baik terakhir sebelum memvandal halaman target:',
				tooltip: 'Biarkan kosong untuk tautan diff ke revisi sebelumnya',
				value: Twinkle.getPrefill('vanarticlegoodrevid') || '',
				disabled: !Twinkle.getPrefill('vanarticle') || Twinkle.getPrefill('vanarticlerevid')
			});
			work_area.append({
				type: 'checkbox',
				name: 'arvtype',
				list: [
					{
						label: 'Vandalisme setelah peringatan akhir (level 4 atau 4im) diberikan',
						value: 'final'
					},
					{
						label: 'Vandalisme setelah masa berlaku pemblokiran berakhir (dalam rentang waktu 1 hari)',
						value: 'postblock'
					},
					{
						label: 'Akun yang terbukti sebagai akun vandalisme semata',
						value: 'vandalonly',
						disabled: mw.util.isIPAddress(root.uid.value)
					},
					{
						label: 'Akun hanya digunakan untuk beriklan',
						value: 'promoonly',
						disabled: mw.util.isIPAddress(root.uid.value)
					},
					{
						label: 'Akun yang terbukti sebuah botspam atau akun terkompromi',
						value: 'spambot'
					}
				]
			});
			work_area.append({
				type: 'textarea',
				name: 'reason',
				label: 'Komentar:'
			});
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;
		case 'username':
			work_area = new Morebits.quickForm.element({
				type: 'field',
				label: 'Laporkan pelanggaran nama pengguna',
				name: 'work_area'
			});
			work_area.append({
				type: 'header',
				label: 'Jenis pelanggaran nama penggunae',
				tooltip: 'Wikipedia tidak mengizinkan nama pengguna yang menyesatkan, promosi, menyinggung, atau mengganggu. Nama domain dan alamat email juga dilarang. Kriteria ini berlaku untuk nama pengguna dan tanda tangan. Nama pengguna yang tidak pantas dalam bahasa lain, atau yang mewakili nama yang tidak sesuai dengan kesalahan ejaan dan penggantian, atau melakukannya secara tidak langsung atau dengan implikasi, masih dianggap melanggar kebijakan Wikipedia.'
			});
			work_area.append({
				type: 'checkbox',
				name: 'arvtype',
				list: [
					{
						label: 'Nama pengguna yang menyesatkan',
						value: 'misleading',
						tooltip: 'Nama pengguna yang menyesatkan menyiratkan hal-hal yang relevan dan menyesatkan tentang kontributor. Misalnya, fakta-fakta yang menyesatkan, kesan otoritas yang tidak semestinya, atau nama pengguna yang memberi kesan akun bot.'
					},
					{
						label: 'Nama pengguna yang berbau promosi',
						value: 'promotional',
						tooltip: 'Nama pengguna promosi adalah iklan untuk sebuah perusahaan, situs web, atau grup. Harap jangan melaporkan nama-nama ini ke UAA kecuali jika pengguna yang dilaporkan telah melakukan penyuntingan promosi terkait dengan nama tersebut.'
					},
					{
						label: 'Nama pengguna yang menyiratkan penggunaan bersama',
						value: 'shared',
						tooltip: 'Nama pengguna yang menyiratkan kemungkinan penggunaan bersama (nama perusahaan atau grup, atau nama pos dalam organisasi) tidak diizinkan. Nama pengguna dapat diterima jika mengandung nama perusahaan atau grup tetapi dengan jelas dimaksudkan untuk menunjukkan seseorang, seperti "Mark di WidgetsUSA", "Jack Smith di Yayasan XY", "WidgetFan87", dll.'
					},
					{
						label: 'Nama pengguna yang ofensif',
						value: 'offensive',
						tooltip: 'Nama pengguna yang ofensif membuat penyuntingan yang harmonis menjadi sulit atau bahkan tidak mungkin.'
					},
					{
						label: 'Nama pengguna yang mengganggu',
						value: 'disruptive',
						tooltip: 'Nama pengguna yang mengganggu termasuk melakukan hal jahil secara langsung atau serangan pribadi, atau menunjukkan niat yang jelas untuk mengganggu Wikipedia.'
					}
				]
			});
			work_area.append({
				type: 'textarea',
				name: 'reason',
				label: 'Komentar:'
			});
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;

		case 'puppet':
			work_area = new Morebits.quickForm.element({
				type: 'field',
				label: 'Laporkan akun tambahan yang terduga',
				name: 'work_area'
			});
			work_area.append(
				{
					type: 'input',
					name: 'sockmaster',
					label: 'Induk akun siluman',
					tooltip: 'Tuliskan hanya nama pengguna dari induk akun siluman tanpa indeks awalan Pengguna:'
				}
			);
			work_area.append({
				type: 'textarea',
				label: 'Bukti:',
				name: 'evidence',
				tooltip: 'Bukti anda harus terbukti jelas bahwa setiap pengguan ini menyalahgunakan beberapa akun. Biasanya hal ini berarti perubahan, riwayat halaman atau informasi lainnya yang menjustifikasikan mengapa penggunanya a) sama dan b) mengganggu. Hal ini harus saja bukti dan informasi yang dibutuhkan untuk memutuskan permasalahan ini. Hindari semua diskusi lainnya yanag tidak membuktikkan dari penggunaan akun kedua.'
			});
			work_area.append({
				type: 'checkbox',
				list: [
					{
						label: 'Minta bukti dari Pemeriksa',
						name: 'checkuser',
						tooltip: 'CheckUser adalah sebuah alat yang digunakan untuk memperoleh bukti teknis yang berhubugan dengan tuduhan penggunaan akun kedua. Alat ini tidak akan digunakan tanpa alasan yang kuat, yang harus Anda buktikan dengan jelas. Pastikan bukti Anda menjelaskan alasan penggunaan alat ini tepat. Alat ini tidak akan digunakan untuk menghubungkan akun pengguna dan alamat IP secara publik.'
					},
					{
						label: 'Beritahu pengguna yang dilaporkan',
						name: 'notify',
						tooltip: 'Notifikasi tidaklah wajib. Dalam banyak kasus, terutama kasus penggunaan akun kedua kronis, notifikasi bisa jadi kontraproduktif. Namun, terutama dalam kasus-kasus yang kurang serius yang melibatkan pengguna yang belum pernah dilaporkan sebelumnya, notifikasi dapat membuat kasus-kasus tersebut lebih adil dan juga tampak lebih adil di mata pihak tertuduh. Gunakan pertimbangan Anda.'
					}
				]
			});
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;
		case 'sock':
			work_area = new Morebits.QuickForm.Element({
				type: 'field',
				label: 'Laporkan induk pemilik akun kedua',
				name: 'work_area'
			});
			work_area.append(
				{
					type: 'dyninput',
					name: 'sockpuppets',
					label: 'Akun kedua:',
					sublabel: 'Sock:',
					tooltip: 'Nama pengguna dari akun kedua tanpa prefix "Pengguna:"',
					min: 2
				});
			work_area.append({
				type: 'textarea',
				label: 'Bukti:',
				name: 'evidence',
				tooltip: 'Bukti Anda harus memperjelas bahwa masing-masing pengguna ini kemungkinan menyalahgunakan beberapa akun. Biasanya ini berarti perbedaan, riwayat halaman, atau informasi lain yang membenarkan mengapa pengguna tersebut a) sama dan b) mengganggu. Ini seharusnya hanya menjadi bukti dan informasi yang diperlukan untuk menilai masalah ini. Hindari semua diskusi lain yang bukan merupakan bukti penyalahgunaan akun..'
			});
			work_area.append({
				type: 'checkbox',
				list: [ {
					label: 'Request CheckUser',
					name: 'checkuser',
					tooltip: 'CheckUser adalah alat yang digunakan untuk mendapatkan bukti teknis terkait tuduhan penyalahgunaan akun. Alat ini tidak akan digunakan tanpa alasan yang kuat, yang harus Anda buktikan dengan jelas. Pastikan bukti Anda menjelaskan mengapa penggunaan alat ini tepat. Alat ini tidak akan digunakan untuk menghubungkan akun pengguna dan alamat IP secara publik.'
				} ]
			});
			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;
		case 'an3':
			work_area = new Morebits.QuickForm.Element({
				type: 'field',
				label: 'Report edit warring',
				name: 'work_area'
			});
			work_area.append({
				type: 'input',
				name: 'page',
				label: 'Halaman',
				tooltip: 'Halamannya sedang dilaporkan'
			});
			work_area.append({
				type: 'button',
				name: 'load',
				label: 'Muat',
				event: function(e) {
					const root = e.target.form;

					const date = new Morebits.Date().subtract(48, 'hours'); // all since 48 hours

					// Run for each AN3 field
					const getAN3Entries = function(field, rvuser, titles) {
						const $field = $(root).find('[name=' + field + ']');
						$field.find('.entry').remove();

						new mw.Api().get({
							action: 'query',
							prop: 'revisions',
							format: 'json',
							rvprop: 'sha1|ids|timestamp|parsedcomment|comment',
							rvlimit: 500, // intentionally limited
							rvend: date.toISOString(),
							rvuser: rvuser,
							indexpageids: true,
							titles: titles
						}).done((data) => {
							const pageid = data.query.pageids[0];
							const page = data.query.pages[pageid];
							if (!page.revisions) {
								$('<span class="entry">Tidak ditemukan</span>').appendTo($field);
							} else {
								for (let i = 0; i < page.revisions.length; ++i) {
									const rev = page.revisions[i];
									const $entry = $('<div>', {
										class: 'entry'
									});
									const $input = $('<input>', {
										type: 'checkbox',
										name: 's_' + field,
										value: rev.revid
									});
									$input.data('revinfo', rev);
									$input.appendTo($entry);
									let comment = '<span>';
									// revdel/os
									if (typeof rev.commenthidden === 'string') {
										comment += '(komentar tersembunyi)';
									} else {
										comment += '"' + rev.parsedcomment + '"';
									}
									comment += ' at <a href="' + mw.config.get('wgScript') + '?diff=' + rev.revid + '">' + new Morebits.Date(rev.timestamp).calendar() + '</a></span>';
									$entry.append(comment).appendTo($field);
								}
							}

							// add free form input for resolves
							if (field === 'resolves') {
								const $free_entry = $('<div>', {
									class: 'entry'
								});
								const $free_input = $('<input>', {
									type: 'text',
									name: 's_resolves_free'
								});

								const $free_label = $('<label>', {
									for: 's_resolves_free',
									html: 'URL link of diff with additional discussions: '
								});
								$free_entry.append($free_label).append($free_input).appendTo($field);
							}
						}).fail(() => {
							$('<span class="entry">API gagal, muat ulang halaman dan coba lagi</span>').appendTo($field);
						});
					};

					// warnings
					const uid = root.uid.value;
					getAN3Entries('warnings', mw.config.get('wgUserName'), 'Pembicaraan pengguna:' + uid);

					// diffs and resolves require a valid page
					const page = root.page.value;
					if (page) {
						// diffs
						getAN3Entries('diffs', uid, page);

						// resolutions
						const t = new mw.Title(page);
						const talk_page = t.getTalkPage().getPrefixedText();
						getAN3Entries('resolves', mw.config.get('wgUserName'), talk_page);
					} else {
						$(root).find('[name=diffs]').find('.entry').remove();
						$(root).find('[name=resolves]').find('.entry').remove();
					}
				}
			});
			work_area.append({
				type: 'field',
				name: 'diffs',
				label: 'Pembalikkan pengguna (dalam kurun waktu 48 terakhir)',
				tooltip: 'Pilih suntingan yang anda yakin adalah pembalikkan'
			});
			work_area.append({
				type: 'field',
				name: 'warnings',
				label: 'Peringatan yang diberikan ke subjek',
				tooltip: 'Anda harus memperingati dahulu subjek sebelum melaporkan'
			});
			work_area.append({
				type: 'field',
				name: 'resolves',
				label: 'Inisiatif penyelesaian',
				tooltip: 'Anda harus mencoba untuk menyelesaikan permasalahan terlebih dahulu di halaman pembicaraan'
			});

			work_area.append({
				type: 'textarea',
				label: 'Komentar:',
				name: 'comment'
			});

			work_area = work_area.render();
			old_area.parentNode.replaceChild(work_area, old_area);
			break;
	}
};

Twinkle.arv.callback.evaluate = function(e) {
	const form = e.target;
	let reason = '';
	const input = Morebits.QuickForm.getInputData(form);

	const uid = form.uid.value;

	switch (input.category) {

		// Report user for vandalism
		case 'aiv':
			/* falls through */
		default:
			reason = Twinkle.arv.callback.getAivReasonWikitext(input);

			if (reason === null) {
				alert('Anda harus menyertakan alasan');
				return;
			}

			Morebits.SimpleWindow.setButtonsEnabled(false);
			Morebits.Status.init(form);

			Morebits.wiki.actionCompleted.redirect = 'Wikipedia:Intervensi pengurus terhadap vandalisme';
			Morebits.wiki.actionCompleted.notice = 'Pelaporan selesai';

			var aivPage = new Morebits.wiki.Page('Wikipedia:Intervensi pengurus terhadap vandalisme', 'Memproses permintaan AIV');
			aivPage.setPageSection(1);
			aivPage.setFollowRedirect(true);

			aivPage.load(() => {
				const text = aivPage.getPageText();
				const $aivLink = '<a target="_blank" href="/wiki/WP:AIV">WP:AIV</a>';

				// check if user has already been reported
				if (new RegExp('\\{\\{\\s*(?:(?:[Ii][Pp])?[Vv]andal|[Uu]serlinks)\\s*\\|\\s*(?:1=)?\\s*' + Morebits.string.escapeRegExp(input.uid) + '\\s*\\}\\}').test(text)) {
					aivPage.getStatusElement().error('Telah ada laporan, tidak akan membuatmnya lagi');
					Morebits.Status.printUserText(reason, 'Komentar yang Anda ketik disediakan di bawah ini, jika Anda ingin mempostingnya secara manual di bawah laporan yang ada untuk pengguna ini di ' + $aivLink + ':');
					return;
				}

				// then check for any bot reports
				const tb2Page = new Morebits.wiki.Page('Wikipedia:Intervensi pengurus terhadap vandalisme/TB2', 'Memeriksa laporan bot');
				tb2Page.load(() => {
					const tb2Text = tb2Page.getPageText();
					const tb2statelem = tb2Page.getStatusElement();

					if (new RegExp('\\{\\{\\s*(?:(?:[Ii][Pp])?[Vv]andal|[Uu]serlinks)\\s*\\|\\s*(?:1=)?\\s*' + Morebits.string.escapeRegExp(input.uid) + '\\s*\\}\\}').test(tb2Text)) {
						if (confirm('Pengguna ' + input.uid + ' telah dilaporkan oleh sebua bot. Apakah anda ingin tetap melaporkannya?')) {
							tb2statelem.info('Melaporkan walau dilaporkan bot');
						} else {
							tb2statelem.error('Laporan dari bot sudah ada, berhenti');
							Morebits.Status.printUserText(reason, 'Komentar yang Anda ketik disediakan di bawah ini, jika Anda ingin mempostingnya secara manual di ' + $aivLink + ':');
							return;
						}
					} else {
						tb2statelem.info('Tidak ada laporan bot yang konflik');
					}

					aivPage.getStatusElement().status('Menambahkan laporan baru...');
					aivPage.setEditSummary('Melaporkan [[Special:Contributions/' + input.uid + '|' + input.uid + ']].');
					aivPage.setChangeTags(Twinkle.changeTags);
					aivPage.setAppendText(Twinkle.arv.callback.buildAivReport(input));
					aivPage.append();
				});
			});
			break;

		// Report inappropriate username
		case 'username':
			var censorUsername = input.arvtype.includes('offensive'); // check if the username is marked offensive

			reason = Twinkle.arv.callback.getUsernameReportWikitext(input);

			Morebits.SimpleWindow.setButtonsEnabled(false);
			Morebits.Status.init(form);

			Morebits.wiki.actionCompleted.redirect = 'Wikipedia:Permintaan perhatian nama pengguna';
			Morebits.wiki.actionCompleted.notice = 'Melaporkan selesai';

			var uaaPage = new Morebits.wiki.Page('Wikipedia:Permintaan perhatian nama pengguna', 'Memproses permintaan UAA');
			uaaPage.setFollowRedirect(true);

			uaaPage.load(() => {
				const text = uaaPage.getPageText();

				// check if user has already been reported
				if (new RegExp('\\{\\{\\s*user-uaa\\s*\\|\\s*(1\\s*=\\s*)?' + Morebits.string.escapeRegExp(input.uid) + '\\s*(\\||\\})').test(text)) {
					uaaPage.getStatusElement().error('User is already listed.');
					const $uaaLink = '<a target="_blank" href="/wiki/WP:UAA">WP:UAA</a>';
					Morebits.Status.printUserText(reason, 'The comments you typed are provided below, in case you wish to manually post them under the existing report for this user at ' + $uaaLink + ':');
					return;
				}
				uaaPage.getStatusElement().status('Menambahkan laporan baru...');
				uaaPage.setEditSummary('Melaporkan ' + (censorUsername ? 'sebagai nama pengguna ofensif.' : '[[Special:Contributions/' + input.uid + '|' + input.uid + ']].'));
				uaaPage.setChangeTags(Twinkle.changeTags);

				// Blank newline per [[Special:Permalink/996949310#Spacing]]; see also [[WP:LISTGAP]] and [[WP:INDENTGAP]]
				uaaPage.setPageText(text + '\n' + reason + '\n*');
				uaaPage.save();
			});
			break;

		// WP:SPI
		case 'sock':
			/* falls through */
		case 'puppet':
			var reportData = Twinkle.arv.callback.getSpiReportData(input);

			if (reportData.error) {
				alert(reportData.error);
				return;
			}

			Morebits.SimpleWindow.setButtonsEnabled(false);
			Morebits.Status.init(form);

			Morebits.wiki.addCheckpoint(); // prevent notification events from causing an erronous "action completed"

			var reportpage = 'Wikipedia:Investigasi pengguna siluman/' + reportData.sockmaster;

			Morebits.wiki.actionCompleted.redirect = reportpage;
			Morebits.wiki.actionCompleted.notice = 'Pelaporan selesai';

			var spiPage = new Morebits.wiki.page(reportpage, 'Nengambil halaman diskusi');
			spiPage.setFollowRedirect(true);
			spiPage.setEditSummary('Menambahkan laporan baru untuk [[Special:Contributions/' + reportData.sockmaster + '|' + reportData.sockmaster + ']].');
			spiPage.setChangeTags(Twinkle.changeTags);
			spiPage.setAppendText(reportData.wikitext);
			spiPage.setWatchlist(Twinkle.getPref('spiWatchReport'));
			spiPage.append();

			Morebits.wiki.removeCheckpoint(); // all page updates have been started
			break;

		case 'an3':
			var diffs = $.map($('input:checkbox[name=s_diffs]:checked', form), (o) => $(o).data('revinfo'));

			if (diffs.length < 3 && !confirm('Anda memilih suntingan kurang dari tiga suntingan pelanggaran. Apakah Anda ingin membuat laporan tersebut?')) {
				return;
			}

			var warnings = $.map($('input:checkbox[name=s_warnings]:checked', form), (o) => $(o).data('revinfo'));

			if (!warnings.length && !confirm('Anda belum memilih suntingan dari pelanggar yang anda peringati . Apakah Anda ingin membuat laporan tersebut?')) {
				return;
			}

			var resolves = $.map($('input:checkbox[name=s_resolves]:checked', form), (o) => $(o).data('revinfo'));
			var free_resolves = $('input[name=s_resolves_free]').val();

			var an3_next = function(free_resolves) {
				if (!resolves.length && !free_resolves && !confirm('Anda belum memilih suntingan yang dimana anda coba untuk selesaikan . Apakah Anda ingin membuat laporan tersebut?')) {
					return;
				}

				const an3Parameters = {
					uid: uid,
					page: form.page.value.trim(),
					comment: form.comment.value.trim(),
					diffs: diffs,
					warnings: warnings,
					resolves: resolves,
					free_resolves: free_resolves
				};

				Morebits.SimpleWindow.setButtonsEnabled(false);
				Morebits.Status.init(form);
				Twinkle.arv.processAN3(an3Parameters);
			};

			if (free_resolves) {
				let query;
				let diff, oldid;
				const specialDiff = /Special:Diff\/(\d+)(?:\/(\S+))?/i.exec(free_resolves);
				if (specialDiff) {
					if (specialDiff[2]) {
						oldid = specialDiff[1];
						diff = specialDiff[2];
					} else {
						diff = specialDiff[1];
					}
				} else {
					diff = mw.util.getParamValue('diff', free_resolves);
					oldid = mw.util.getParamValue('oldid', free_resolves);
				}
				const title = mw.util.getParamValue('title', free_resolves);
				const diffNum = /^\d+$/.test(diff); // used repeatedly

				// rvdiffto in prop=revisions is deprecated, but action=compare doesn't return
				// timestamps ([[phab:T247686]]) so we can't rely on it unless necessary.
				// Likewise, we can't rely on a meaningful comment for diff=cur.
				// Additionally, links like Special:Diff/123/next, Special:Diff/123/456, or ?diff=next&oldid=123
				// would each require making use of rvdir=newer in the revisions API.
				// That requires a title parameter, so we have to use compare instead of revisions.
				if (oldid && (diff === 'cur' || (!title && (diff === 'next' || diffNum)))) {
					query = {
						action: 'compare',
						fromrev: oldid,
						prop: 'ids|title',
						format: 'json'
					};
					if (diffNum) {
						query.torev = diff;
					} else {
						query.torelative = diff;
					}
				} else {
					query = {
						action: 'query',
						prop: 'revisions',
						rvprop: 'ids|timestamp|comment',
						format: 'json',
						indexpageids: true
					};

					if (diff && oldid) {
						if (diff === 'prev') {
							query.revids = oldid;
						} else {
							query.titles = title;
							query.rvdir = 'newer';
							query.rvstartid = oldid;

							if (diff === 'next' && title) {
								query.rvlimit = 2;
							} else if (diffNum) {
								// Diffs may or may not be consecutive, no limit
								query.rvendid = diff;
							}
						}
					} else {
						// diff=next|prev|cur with no oldid
						// Implies title= exists otherwise it's not a valid diff link (well, it is, but to the Main Page)
						if (diff && /^\D+$/.test(diff)) {
							query.titles = title;
						} else {
							query.revids = diff || oldid;
						}
					}
				}

				new mw.Api().get(query).done((data) => {
					let page;
					if (data.compare && data.compare.fromtitle === data.compare.totitle) {
						page = data;
					} else if (data.query) {
						const pageid = data.query.pageids[0];
						page = data.query.pages[pageid];
					} else {
						return;
					}
					an3_next(page);
				}).fail((data) => {
					console.log('API gagal :(', data); // eslint-disable-line no-console
				});
			} else {
				an3_next();
			}
			break;
	}
};

Twinkle.arv.callback.getAivReasonWikitext = function(input) {
	let text = '';
	let type = input.arvtype;

	if (!type.length && input.reason === '') {
		return null;
	}

	type = type.map((v) => {
		switch (v) {
			case 'final':
				return 'vandalisme setelah peringatan terakhir';
			case 'postblock':
				return 'vandalism setelah pemblokiran baru-baru ini';
			case 'vandalonly':
				return 'tindakan mengidikasikan akun vandal saja';
			case 'promoonly':
				return 'akun hanya digunakan untuk tujuan promosi';
			case 'spambot':
				return 'akun terbukti sebuah bot spam atau akun terkompromi';
			default:
				return 'alasan tidak diketahui';
		}
	}).join('; ');

	if (input.page !== '') {
		// Allow links to redirects, files, and categories
		text = 'Di {{No redirect|:' + input.page + '}}';
		if (input.badid !== '') {
			text += ' ({{diff|' + input.page + '|' + input.badid + '|' + input.goodid + '|diff}})';
		}
		text += ':';
	}

	if (type) {
		text += ' ' + type;
	}

	if (input.reason !== '') {
		const textEndsInPunctuationOrBlank = /([.?!;:]|^)$/.test(text);
		text += textEndsInPunctuationOrBlank ? '' : '.';
		const textIsBlank = text === '';
		text += textIsBlank ? '' : ' ';
		text += input.reason;
	}

	text = text.trim();
	const textEndsInPunctuation = /[.?!;]$/.test(text);
	if (!textEndsInPunctuation) {
		text += '.';
	}

	text += ' ~~~~';
	text = text.replace(/\r?\n/g, '\n*:'); // indent newlines

	return text;
};

Twinkle.arv.callback.buildAivReport = function(input) {
	return '\n*{{vandal|' + (/=/.test(input.uid) ? '1=' : '') + input.uid + '}} &ndash; ' + Twinkle.arv.callback.getAivReasonWikitext(input);
};

Twinkle.arv.callback.getUsernameReportWikitext = function(input) {
	// generate human-readable string, e.g. "misleading and promotional username"
	if (input.arvtype.length <= 2) {
		input.arvtype = input.arvtype.join(' and ');
	} else {
		input.arvtype = [ input.arvtype.slice(0, -1).join(', '), input.arvtype.slice(-1) ].join(' and ');
	}

	// a or an?
	let adjective = 'a';
	if (/[aeiouwyh]/.test(input.arvtype[0] || '')) { // non 100% correct, but whatever, including 'h' for Cockney
		adjective = 'an';
	}

	let text = '*{{user-uaa|1=' + input.uid + '}} &ndash; ';
	if (input.arvtype.length) {
		text += 'Pelanggarana kebijakan nama pengguna per ' + adjective + ' ' + input.arvtype + ' nama pengguna. ';
	}
	if (input.reason !== '') {
		text += Morebits.string.toUpperCaseFirstChar(input.reason);
		const endsInPeriod = /\.$/.test(input.reason);
		if (!endsInPeriod) {
			text += '.';
		}
		text += ' ';
	}
	text += '~~~~';
	text = text.replace(/\r?\n/g, '\n*:'); // indent newlines

	return text;
};

Twinkle.arv.callback.getSpiReportData = function(input) {
	const isPuppetReport = input.category === 'puppet';

	if (!isPuppetReport) {
		input.sockpuppets = input.sockpuppets.filter((sock) => sock !== ''); // ignore empty sockpuppet inputs
	}

	if (isPuppetReport && !input.sockmaster) {
		return { error: 'Anda belum memasukan induk pengguna kedua untuk akun kedua ini. Tolong laporkan akun ini sebagai akun kedua saja.' };
	} else if (!isPuppetReport && input.sockpuppets.length === 0) {
		return { error: 'Anda belum memasukan akun kedua untuk induk pengguna akun kedua ini. Tolong laporkan akun ini sebagai akun kedua saja.' };
	}

	input.sockmaster = input.sockmaster || input.uid;
	input.sockpuppets = isPuppetReport ? [input.uid] : Morebits.array.uniq(input.sockpuppets);

	let text = '\n{{subst:SPI report|' +
		input.sockpuppets.map((sock, index) => (index + 1) + '=' + sock).join('|') + '\n|evidence=' + input.evidence + ' \n';

	if (input.checkuser) {
		text += '|checkuser=yes';
	}
	text += '}}';

	return {
		sockmaster: input.sockmaster,
		wikitext: text
	};
};

Twinkle.arv.processAN3 = function(params) {
	// prepare the AN3 report
	let minid;
	for (let i = 0; i < params.diffs.length; ++i) {
		if (params.diffs[i].parentid && (!minid || params.diffs[i].parentid < minid)) {
			minid = params.diffs[i].parentid;
		}
	}

	new mw.Api().get({
		action: 'query',
		prop: 'revisions',
		format: 'json',
		rvprop: 'sha1|ids|timestamp|comment',
		rvlimit: 100, // intentionally limited
		rvstartid: minid,
		rvexcludeuser: params.uid,
		indexpageids: true,
		titles: params.page
	}).done((data) => {
		Morebits.wiki.addCheckpoint(); // prevent notification events from causing an erronous "action completed"

		// In case an edit summary was revdel'd
		const hasHiddenComment = function(rev) {
			if (!rev.comment && typeof rev.commenthidden === 'string') {
				return '(komentar tersembunyi)';
			}
			return '"' + rev.comment + '"';

		};

		let orig;
		if (data.length) {
			const sha1 = data[0].sha1;
			for (let i = 1; i < data.length; ++i) {
				if (data[i].sha1 === sha1) {
					orig = data[i];
					break;
				}
			}

			if (!orig) {
				orig = data[0];
			}
		}

		let origtext = '';
		if (orig) {
			origtext = '{{diff2|' + orig.revid + '|' + orig.timestamp + '}} ' + hasHiddenComment(orig);
		}

		const grouped_diffs = {};

		let parentid, lastid;
		for (let j = 0; j < params.diffs.length; ++j) {
			const cur = params.diffs[j];
			if ((cur.revid && cur.revid !== parentid) || lastid === null) {
				lastid = cur.revid;
				grouped_diffs[lastid] = [];
			}
			parentid = cur.parentid;
			grouped_diffs[lastid].push(cur);
		}

		const difftext = $.map(grouped_diffs, (sub) => {
			let ret = '';
			if (sub.length >= 2) {
				const last = sub[0];
				const first = sub.slice(-1)[0];
				const label = 'Suntingan konsenkutif dari ' + new Morebits.Date(first.timestamp).format('HH:mm, D MMMM YYYY', 'utc') + ' (UTC) to ' + new Morebits.Date(last.timestamp).format('HH:mm, D MMMM YYYY', 'utc') + ' (UTC)';
				ret = '# {{diff|oldid=' + first.parentid + '|diff=' + last.revid + '|label=' + label + '}}\n';
			}
			ret += sub.reverse().map((v) => (sub.length >= 2 ? '#' : '') + '# {{diff2|' + v.revid + '|' + new Morebits.Date(v.timestamp).format('HH:mm, D MMMM YYYY', 'utc') + ' (UTC)}} ' + hasHiddenComment(v)).join('\n');
			return ret;
		}).reverse().join('\n');
		const warningtext = params.warnings.reverse().map((v) => '#  {{diff2|' + v.revid + '|' + new Morebits.Date(v.timestamp).format('HH:mm, D MMMM YYYY', 'utc') + ' (UTC)}} ' + hasHiddenComment(v)).join('\n');
		let resolvetext = params.resolves.reverse().map((v) => '#  {{diff2|' + v.revid + '|' + new Morebits.Date(v.timestamp).format('HH:mm, D MMMM YYYY', 'utc') + ' (UTC)}} ' + hasHiddenComment(v)).join('\n');

		if (params.free_resolves) {
			const page = params.free_resolves;
			if (page.compare) {
				resolvetext += '\n#  {{diff|oldid=' + page.compare.fromrevid + '|diff=' + page.compare.torevid + '|label=Consecutive edits on ' + page.compare.totitle + '}}';
			} else if (page.revisions) {
				const revCount = page.revisions.length;
				let rev;
				if (revCount < 3) { // diff=prev or next
					rev = revCount === 1 ? page.revisions[0] : page.revisions[1];
					resolvetext += '\n#  {{diff2|' + rev.revid + '|' + new Morebits.Date(rev.timestamp).format('HH:mm, D MMMM YYYY', 'utc') + ' (UTC) di ' + page.title + '}} ' + hasHiddenComment(rev);
				} else { // diff and oldid are nonconsecutive
					rev = page.revisions[0];
					const revLatest = page.revisions[revCount - 1];
					const label = 'Suntingan konsenkutif dari ' + new Morebits.Date(rev.timestamp).format('HH:mm, D MMMM YYYY', 'utc') + ' (UTC) to ' + new Morebits.Date(revLatest.timestamp).format('HH:mm, D MMMM YYYY', 'utc') + ' (UTC) di ' + page.title;
					resolvetext += '\n# {{diff|oldid=' + rev.revid + '|diff=' + revLatest.revid + '|label=' + label + '}}\n';
				}
			}
		}

		let comment = params.comment.replace(/~*$/g, '').trim();

		if (comment) {
			comment += ' ~~~~';
		}

		const text = '\n\n{{subst:AN3 report|diffs=' + difftext + '|warnings=' + warningtext + '|resolves=' + resolvetext + '|pagename=' + params.page + '|orig=' + origtext + '|comment=' + comment + '|uid=' + params.uid + '}}';

		const reportpage = 'Wikipedia:Pengurus\' noticeboard/Edit warring';

		Morebits.wiki.actionCompleted.redirect = reportpage;
		Morebits.wiki.actionCompleted.notice = 'Melaporkan selesai';

		const an3Page = new Morebits.wiki.Page(reportpage, 'Memperoleh halaman diskusi');
		an3Page.setFollowRedirect(true);
		an3Page.setEditSummary('Menmabahkan laporan baru untuk [[Istimewa:Kontribusi/' + params.uid + '|' + params.uid + ']].');
		an3Page.setChangeTags(Twinkle.changeTags);
		an3Page.setAppendText(text);
		an3Page.append();

		// notify user

		const notifyText = '\n\n{{subst:an3-notice|1=' + mw.util.wikiUrlencode(params.uid) + '|auto=1}} ~~~~';

		const talkPage = new Morebits.wiki.Page('Pembicaraa pengguna:' + params.uid, 'Notifying edit warrior');
		talkPage.setFollowRedirect(true);
		talkPage.setEditSummary('Memberitahukan papan diskusi peringatan peyuntingan.');
		talkPage.setChangeTags(Twinkle.changeTags);
		talkPage.setAppendText(notifyText);
		talkPage.append();
		Morebits.wiki.removeCheckpoint(); // all page updates have been started
	}).fail((data) => {
		console.log('API gagal :(', data); // eslint-disable-line no-console
	});
};

Twinkle.addInitCallback(Twinkle.arv, 'arv');
}());

// </nowiki>
