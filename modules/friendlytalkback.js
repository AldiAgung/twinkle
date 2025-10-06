// <nowiki>

(function() {

/*
 ****************************************
 *** twinkletalkback.js: Talkback module
 ****************************************
 * Mode of invocation:     Tab ("TB")
 * Active on:              Any page with relevant user name (userspace, contribs, etc.) except IP ranges
 */

Twinkle.talkback = function() {
	if (!mw.config.exists('wgRelevantUserName') || Morebits.ip.isRange(mw.config.get('wgRelevantUserName'))) {
		return;
	}
	Twinkle.addPortletLink(Twinkle.talkback.callback, 'TB', 'twinkle-talkback', 'Easy talkback');
};

Twinkle.talkback.callback = function() {
	if (mw.config.get('wgRelevantUserName') === mw.config.get('wgUserName') && !confirm("Akankah sangat buruk jika anda membalas kembali kepada anda?")) {
		return;
	}

	const Window = new Morebits.SimpleWindow(600, 350);
	Window.setTitle('Talkback');
	Window.setScriptName('Twinkle');
	Window.addFooterLink('Preferensi balasan percakapan', 'WP:TW/PREF#talkback');
	Window.addFooterLink('Bantuan Twinkle', 'WP:TW/DOC#talkback');
	Window.addFooterLink('Berikan umpan balik', 'WT:TW');

	const form = new Morebits.QuickForm(Twinkle.talkback.evaluate);

	form.append({ type: 'radio', name: 'tbtarget',
		list: [
			{
				label: 'Balasan percakapan: halaman pembicaraan saya',
				value: 'talkback',
				checked: 'true'
			},
			{
				label: '"Mohon lihat"',
				value: 'see'
			},
			{
				label: 'Notifikasi pengumuman',
				value: 'notice'
			},
			{
				label: '"Anda mendapat pesan"',
				value: 'mail'
			}
		],
		event: Twinkle.talkback.changeTarget
	});

	form.append({
		type: 'field',
		label: 'Area kerja',
		name: 'work_area'
	});

	const previewlink = document.createElement('a');
	$(previewlink).on('click', () => {
		Twinkle.talkback.callbacks.preview(result); // |result| is defined below
	});
	previewlink.style.cursor = 'pointer';
	previewlink.textContent = 'Pratinjau';
	form.append({ type: 'div', id: 'talkbackpreview', label: [ previewlink ] });
	form.append({ type: 'div', id: 'twinkletalkback-previewbox', style: 'display: none' });

	form.append({ type: 'submit' });

	var result = form.render();
	Window.setContent(result);
	Window.display();
	result.previewer = new Morebits.wiki.Preview($(result).find('div#twinkletalkback-previewbox').last()[0]);

	// We must init the
	const evt = document.createEvent('Event');
	evt.initEvent('change', true, true);
	result.tbtarget[0].dispatchEvent(evt);

	// Check whether the user has opted out from talkback
	const query = {
		action: 'query',
		prop: 'extlinks',
		titles: 'User talk:' + mw.congifig.get('wgRelevantUserName'),
		elquery: 'userjs.invalid/noTalkback',
		ellimit: '1',
		format: 'json'
	};
	const wpapi = new Morebits.wiki.Api('Mengambil status berhenti berlangganan balasan percakapan', query, Twinkle.talkback.callback.optoutStatus);
	wpapi.post();
};

Twinkle.talkback.optout = '';

Twinkle.talkback.callback.optoutStatus = function(apiobj) {
	const el = apiobj.getResponse().query.pages[0].extlinks;
	if (el && el.length) {
		Twinkle.talkback.optout = mw.config.get('wgRelevantUserName') + ' memilih untuk tidak menerima balasan percakapan';
		const url = el[0].url;
		const reason = mw.util.getParamValue('reason', url);
		Twinkle.talkback.optout += reason ? ': ' + reason : '.';
	}
	$('#twinkle-talkback-optout-message').text(Twinkle.talkback.optout);
};

let prev_page = '';
let prev_section = '';
let prev_message = '';

Twinkle.talkback.changeTarget = function(e) {
	const value = e.target.values;
	const root = e.target.form;

	const old_area = Morebits.QuickForm.getElements(root, 'work_area')[0];

	if (root.section) {
		prev_section = root.section.value;
	}
	if (root.message) {
		prev_message = root.message.value;
	}
	if (root.page) {
		prev_page = root.page.value;
	}

	let work_area = new Morebits.QuickForm.Element({
		type: 'field',
		label: 'Informasi balasan percakapan',
		name: 'work_area'
	});

	root.previewer.closePreview();

	switch (value) {
		case 'talkback':
			/* falls through */
		default:
			work_area.append({
				type: 'div',
				label: '',
				style: 'color: red',
				id: 'twinkle-talkback-optout-message'
			});

			work_area.append({
				type: 'input',
				name: 'page',
				label: 'Nama halaman dari diskusi:',
				tooltip: "Nama halaman yang dimana diskusi sedang dilakukan. Sebagai contoh: 'Pembicaraan pengguna:Jimbo Wales'atau  Pembicaraan Wikipedia:Twinkle'. Terbatas untuk semua pembicaraan, ruang-Wikipedia, dan ruang-templat.",
				value: prev_page || 'Pembicaraan pengguna:' + mw.config.get('wgUserName')
			});
			work_area.append({
				type: 'input',
				name: 'section',
				label: 'Bagian tertaut (opsional)',
				tooltip: "Judul atas bagian yang dimana diskusi sedang dilakukan. Sebagai contoh: 'Usulan penggabungan'.",
				value: prev_section
			});
			break;
		case 'notice':
			var noticeboard = work_area.append({
				type: 'select',
				name: 'noticeboard',
				label: 'Papan pengumuman:',
				event: function(e) {
					if (e.target.value === 'afchd') {
						Morebits.QuickForm.overrideElementLabel(root.section, 'Judul draft (tidak termasuk prefix): ');
						Morebits.QuickForm.setElementTooltipVisibility(root.section, false);
					} else {
						Morebits.QuickForm.resetElementLabel(root.section);
						Morebits.QuickForm.setElementTooltipVisibility(root.section, true);
					}
				}
			});

			$.each(Twinkle.talkback.noticeboards, (value, data) => {
				noticeboard.append({
					type: 'option',
					label: data.label,
					value: value,
					selected: !!data.defaultSelected
				});
			});

			work_area.append({
				type: 'input',
				name: 'section',
				label: 'Thread yang tertaut',
				tooltip: 'Judul thread yang relevan pada halaman papan pengumuman.',
				value: prev_section
			});
			break;
		case 'mail':
			work_area.append({
				type: 'input',
				name: 'section',
				label: 'Subjek surel (opsional)',
				tooltip: 'Baris subjek dari surel yang anda kirimkan.'
			});
			break;
	}

	if (value !== 'notice') {
		work_area.append({ type: 'textarea', label: 'Pesan tambahan (opsional):', name: 'message', tooltip: 'Pesan tambahan yang anda ingin tinggalkan dibawah templat balasan percakapan. Tanda tangan anda akan ditambahkan di akhir pesana jika anda menambahkannya.' });
	}

	work_area = work_area.render();
	root.replaceChild(work_area, old_area);
	if (root.message) {
		root.message.value = prev_message;
	}

	$('#twinkle-talkback-optout-message').text(Twinkle.talkback.optout);
};

Twinkle.talkback.noticeboards = {
	an: {
		label: "WP:AN (Papan pengumuman pengurus)",
		text: '{{subst:AN-notice|thread=$SECTION}} ~~~~',
		editSummary: 'Pemberitahuan diskusi di [[Wikipedia:Papan pengumuman pengurus]]',
	},
	an3: {
		label: "WP:AN3 (Papan pengumuman pengurus/Edit warring)",
		text: '{{subst:An3-notice|$SECTION}} ~~~~',
		editSummary: "Pemberitahuan diskusi di [[Wikipedia:Papan pengumuman pengurus/Edit warring]]"
	},
	ani: {
		label: "WP:ANI (Papan pengumuman pengurus/Incidents)",
		text: "== Notice of Administrators' noticeboard/Incidents discussion ==\n" +
		'{{subst:ANI-notice|thread=$SECTION}} ~~~~',
		editSummary: 'Pemberitahuan diskusi di [[Wikipedia:Administrators\' noticeboard/Incidents]]',
		defaultSelected: true
	},
	// let's keep AN and its cousins at the top
	afchd: {
		label: 'WP:AFCHD (Articles for creation/Help desk)',
		text: '{{subst:AFCHD/u|$SECTION}} ~~~~',
		editSummary: 'Anda telah membalas di [[Wikipedia:AFCHD|Articles for Creation Help Desk]]'
	},
	blpn: {
		label: 'WP:BLPN (Biographies of living persons noticeboard)',
		text: '{{subst:BLPN-notice|thread=$SECTION}} ~~~~',
		editSummary: 'Pemberitahuan diskusi di [[Wikipedia:Biographies of living persons/Noticeboard]]'
	},
	coin: {
		label: 'WP:COIN (Conflict of interest noticeboard)',
		text: '{{subst:Coin-notice|thread=$SECTION}} ~~~~',
		editSummary: 'Pemberitahuan diskusi di [[Wikipedia:Conflict of interest/Noticeboard]]'
	},
	drn: {
		label: 'WP:DRN (Dispute resolution noticeboard)',
		text: '{{subst:DRN-notice|thread=$SECTION}} ~~~~',
		editSummary: 'Pemberitahuan diskusi di [[Wikipedia:Dispute resolution noticeboard]]'
	},
	effp: {
		label: 'WP:EFFP/R (Edit filter false positive report)',
		text: '{{EFFPReply|1=$SECTION|2=~~~~}}',
		editSummary: 'You have replies to your [[Wikipedia:Edit filter/False positives/Reports|edit filter false positive report]]'
	},
	eln: {
		label: 'WP:ELN (External links noticeboard)',
		text: '{{subst:ELN-notice|thread=$SECTION}} ~~~~',
		editSummary: 'Pemberitahuan diskusi di [[Wikipedia:External links/Noticeboard]]'
	},
	ftn: {
		label: 'WP:FTN (Fringe theories noticeboard)',
		text: '{{subst:Ftn-notice|thread=$SECTION}} ~~~~',
		editSummary: 'Pemberitahuan diskusi di [[Wikipedia:Fringe theories/Noticeboard]]'
	},
	hd: {
		label: 'WP:HD (Help desk)',
		text: '== Your question at the Help desk ==\n{{helpdeskreply|1=$SECTION|ts=~~~~~}}',
		editSummary: 'Anda telah membalas di [[Wikipedia:Help desk|Wikipedia help desk]]'
	},
	norn: {
		label: 'WP:NORN (No original research noticeboard)',
		text: '{{subst:Norn-notice|thread=$SECTION}} ~~~~',
		editSummary: 'Pemberitahuan diskusi di [[Wikipedia:No original research/Noticeboard]]'
	},
	npovn: {
		label: 'WP:NPOVN (Neutral point of view noticeboard)',
		text: '{{subst:NPOVN-notice|thread=$SECTION}} ~~~~',
		editSummary: 'Pemberitahuan diskusi di [[Wikipedia:Neutral point of view/Noticeboard]]'
	},
	rsn: {
		label: 'WP:RSN (Reliable sources noticeboard)',
		text: '{{subst:RSN-notice|thread=$SECTION}} ~~~~',
		editSummary: 'Pemberitahuan diskusi di [[Wikipedia:Reliable sources/Noticeboard]]'
	},
	th: {
		label: 'WP:THQ (Teahouse question forum)',
		text: "== Teahouse talkback: you've got messages! ==\n{{WP:Teahouse/Teahouse talkback|WP:Teahouse/Questions|$SECTION|ts=~~~~}}",
		editSummary: 'Anda telah membalas di [[Wikipedia:Teahouse/Questions|Teahouse question board]]'
	},
	vrt: {
		label: 'WP:VRTN (VRT noticeboard)',
		text: '{{subst:VRTreply|1=$SECTION}}\n~~~~',
		editSummary: 'Anda telah membalas di [[Wikipedia:VRT noticeboard|VRT noticeboard]]'
	}
};

Twinkle.talkback.evaluate = function(e) {
	const input = Morebits.QuickForm.getInputData(e.target);

	const fullUserTalkPageName = new mw.Title(mw.config.get('wgRelevantUserName'), 3).toText();
	const talkpage = new Morebits.wiki.Page(fullUserTalkPageName, 'Menambahkan balasan percakapan');

	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(e.target);

	Morebits.wiki.actionCompleted.redirect = fullUserTalkPageName;
	Morebits.wiki.actionCompleted.notice = 'Balasan percakapan selesai; memuat ulang halaman pembicaraan dengan segera.';

	switch (input.tbtarget) {
		case 'notice':
			talkpage.setEditSummary(Twinkle.talkback.noticeboards[input.noticeboard].editSummary);
			break;
		case 'mail':
			talkpage.setEditSummary("Notifikasi: Anda mendapatkan surel");
			break;
		case 'see':
			input.page = Twinkle.talkback.callbacks.normalizeTalkbackPage(input.page);
			talkpage.setEditSummary('Tolong periksa diskusi pada  [[:' + input.page +
			(input.section ? '#' + input.section : '') + ']]');
			break;
		default: // talkback
			input.page = Twinkle.talkback.callbacks.normalizeTalkbackPage(input.page);
			talkpage.setEditSummary('Balasan percakapan ([[:' + input.page +
			(input.section ? '#' + input.section : '') + ']])');
			break;
	}

	talkpage.setFollowRedirect(true);

	talkpage.load((pageobj) => {
		const whitespaceToPrepend = pageobj.exists() && pageobj.getPageText() !== '' ? '\n\n' : '';
		talkpage.setAppendText(whitespaceToPrepend + Twinkle.talkback.callbacks.getNoticeWikitext(input));
		talkpage.setChangeTags(Twinkle.changeTags);
		talkpage.setCreateOption('recreate');
		talkpage.setMinorEdit(Twinkle.getPref('markTalkbackAsMinor'));
		talkpage.append();
	});
};

Twinkle.talkback.callbacks = {
	// Not used for notice or mail, default to user page
	normalizeTalkbackPage: function(page) {
		page = page || mw.config.get('wgUserName');

		// Assume no prefix is a username, convert to user talk space
		let normal = mw.Title.newFromText(page, 3);
		// Normalize erroneous or likely mis-entered items
		if (normal) {
			// Only allow talks and WPspace, as well as Template-space for DYK
			if (normal.namespace !== 4 && normal.namespace !== 10) {
				normal = normal.getTalkPage();
			}
			page = normal.getPrefixedText();
		}
		return page;
	},

	preview: function(form) {
		const input = Morebits.QuickForm.getInputData(form);

		if (input.tbtarget === 'talkback' || input.tbtarget === 'see') {
			input.page = Twinkle.talkback.callbacks.normalizeTalkbackPage(input.page);
		}

		const noticetext = Twinkle.talkback.callbacks.getNoticeWikitext(input);
		form.previewer.beginRender(noticetext, 'Pembicaraan pengguna:' + mw.config.get('wgRelevantUserName')); // Force wikitext/correct username
	},

	getNoticeWikitext: function(input) {
		let text;

		switch (input.tbtarget) {
			case 'notice':
				text = Morebits.string.safeReplace(Twinkle.talkback.noticeboards[input.noticeboard].text, '$SECTION', input.section);
				break;
			case 'mail':
				text = '==' + Twinkle.getPref('mailHeading') + '==\n' +
					"{{Anda mendapatkan pesan|subject=" + input.section + '|ts=~~~~~}}';

				if (input.message) {
					text += '\n' + input.message + '  ~~~~';
				} else if (Twinkle.getPref('insertTalkbackSignature')) {
					text += '\n~~~~';
				}
				break;
			case 'see':
				var heading = Twinkle.getPref('talkbackHeading');
				text = '{{subst:Please see|location=' + input.page + (input.section ? '#' + input.section : '') +
				'|more=' + input.message + '|heading=' + heading + '}}';
				break;
			default: // talkback
				text = '==' + Twinkle.getPref('talkbackHeading') + '==\n' +
					'{{talkback|' + input.page + (input.section ? '|' + input.section : '') + '|ts=~~~~~}}';

				if (input.message) {
					text += '\n' + input.message + ' ~~~~';
				} else if (Twinkle.getPref('insertTalkbackSignature')) {
					text += '\n~~~~';
				}
		}
		return text;
	}
};
Twinkle.addInitCallback(Twinkle.talkback, 'talkback');
}());

// </nowiki>
