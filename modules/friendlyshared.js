// <nowiki>

(function() {

/*
 ****************************************
 *** twinkleshared.js: Shared IP tagging module
 ****************************************
 * Mode of invocation:     Tab ("Shared")
 * Active on:              IP user talk pages
 */

Twinkle.shared = function twinkleshared() {
	if (mw.config.get('wgNamespaceNumber') === 3 && mw.util.isIPAddress(mw.config.get('wgTitle'))) {
		const username = mw.config.get('wgRelevantUserName');
		Twinkle.addPortletLink(() => {
			Twinkle.shared.callback(username);
		}, 'Shared IP', 'twinkle-shared', 'Shared IP tagging');
	}
};

Twinkle.shared.callback = function twinklesharedCallback() {
	const Window = new Morebits.SimpleWindow(600, 450);
	Window.setTitle('Menandai alamat ip berbagi');
	Window.setScriptName('Twinkle');
	Window.addFooterLink('preferensi berbagi', 'WP:TW/PREF#shared');
	Window.addFooterLink('Bantuan Twinkle', 'WP:TW/DOC#shared');
	Window.addFooterLink('Berikan ulasan', 'WT:TW');

	const form = new Morebits.QuickForm(Twinkle.shared.callback.evaluate);

	const div = form.append({
		type: 'div',
		id: 'sharedip-templatelist',
		className: 'morebits-scrollbox'
	}
	);
	div.append({ type: 'header', label: 'Templat IP berbagi' });
	div.append({ type: 'radio', name: 'template', list: Twinkle.shared.standardList,
		event: function(e) {
			Twinkle.shared.callback.change_shared(e);
			e.stopPropagation();
		}
	});

	const org = form.append({ type: 'field', label: 'Isi di detail lainnya (opsional) dan klik "Kirim"' });
	org.append({
		type: 'input',
		name: 'organization',
		label: 'Operator/pemilik alamat ip',
		disabled: true,
		tooltip: 'Anda secara opsional dapat memasukan nama dari organisasi yang memiliki/mengendalikkan alamat ip tersebut. Anda dapat markah wiki jika dibutuhkan.'
	}
	);
	org.append({
		type: 'input',
		name: 'host',
		label: 'Nama hos (opsional)',
		disabled: true,
		tooltip: 'Nama hos (sebagai contoh, proxy.example.com) dapat secara opsional dimasukan disini dan ditautkan dengan templatnya.'
	}
	);
	org.append({
		type: 'input',
		name: 'contact',
		label: 'Informasi kontak (hanya jika )',
		disabled: true,
		tooltip: 'Anda dapat memasukan secara opsional beberapa detail kontak untuk organisasi. Gunakan parameter ini hanya jika organisasi telah meminta hal tersebut untuk ditambakan. Anda dapat menambahkan markah wiki jika dibutuhkan.'
	}
	);

	const previewlink = document.createElement('a');
	$(previewlink).on('click', () => {
		Twinkle.shared.preview(result);
	});
	previewlink.style.cursor = 'pointer';
	previewlink.textContent = 'Preview';
	form.append({ type: 'div', id: 'sharedpreview', label: [ previewlink ] });
	form.append({ type: 'submit' });

	var result = form.render();
	Window.setContent(result);
	Window.display();
};

Twinkle.shared.standardList = [
	{
		label: '{{Ip berbagi}}: templat alamat IP berbagi',
		value: 'Shared IP',
		tooltip: 'Templat halaman pembicaraan pengguna IP yang memberikan informasi berguna kepada pengguna IP dan bagi yang ingin memperingati, memblokir, atau mencegah mereka'
	},
	{
		label: '{{IP berbagi intansi pendidikan}}: Templat alamat IP yang dimodifikasi untuk institusi edukasi',
		value: 'Shared IP edu'
	},
	{
		label: '{{Ip berbagi perusahaan}}: Templat alamat IP yang dimodifikasi untuk bisnis',
		value: 'Shared IP corp'
	},
	{
		label: '{{Ip berbagi publik}}: Templat alamat IP yang dimodifikasi untuk terminal publik',
		value: 'Shared IP public'
	},
	{
		label: '{{Ip pemerintah berbagi}}: Templat alamat IP yang dimodifikasi untuk fasilitas pemerintahan atau agensi',
		value: 'Shared IP gov'
	},
	{
		label: '{{Ip dinamis}}: Templat alamat IP yang dimodifikasi untuk organisasi dengan pengalamatan dinamis with dynamic addressing',
		value: 'Dynamic IP'
	},
	{
		label: '{{Ip statis}}: templat alamat IP berbagi untuk alamat IP statis',
		value: 'Static IP'
	},
	{
		label: '{{ISP}}: templat alamat IP berbagi dimodifikasi untuk organisasi ISP (spesifik proksi)',
		value: 'ISP'
	},
	{
		label: '{{Ip seluler}}: templat alamat IP berbagi dimodifikasi untuk perusahaan telepon seluler dan pelanggan mereka',
		value: 'Mobile IP'
	},
	{
		label: '{{Whois}}: templat untuk alamat IP yang diawasi, tetapi tidak diketahui apakah statis, dinamis atau berbagi',
		value: 'Whois'
	}
];

Twinkle.shared.callback.change_shared = function twinklesharedCallbackChangeShared(e) {
	e.target.form.contact.disabled = e.target.value !== 'Ip berbagi instansi pendidikan'; // only supported by {{Shared IP edu}}
	e.target.form.organization.disabled = false;
	e.target.form.host.disabled = e.target.value === 'Whois'; // host= not supported by {{Whois}}
};

Twinkle.shared.callbacks = {
	main: function(pageobj) {
		const params = pageobj.getCallbackParameters();
		const pageText = pageobj.getPageText();
		let found = false;

		for (let i = 0; i < Twinkle.shared.standardList.length; i++) {
			const tagRe = new RegExp('(\\{\\{' + Twinkle.shared.standardList[i].value + '(\\||\\}\\}))', 'im');
			if (tagRe.exec(pageText)) {
				Morebits.Status.warn('Info', 'Telah menemukan {{' + Twinkle.shared.standardList[i].value + '}} di halaman pembicaraan pengguna...membatalkan');
				found = true;
			}
		}

		if (found) {
			return;
		}

		Morebits.Status.info('Info', 'Akan menambahkan templat alamat ip berbagi di atas halaman pembicaraan pengguna.');
		const text = Twinkle.shared.getTemplateWikitext(params);

		const summaryText = 'Ditambahkan templat {{[[Templat:' + params.template + '|' + params.template + ']]}}.';
		pageobj.setPageText(text + pageText);
		pageobj.setEditSummary(summaryText);
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setMinorEdit(Twinkle.getPref('markSharedIPAsMinor'));
		pageobj.setCreateOption('recreate');
		pageobj.save();
	}
};

Twinkle.shared.preview = function(form) {
	const input = Morebits.QuickForm.getInputData(form);
	if (input.template) {
		const previewDialog = new Morebits.SimpleWindow(700, 500);
		previewDialog.setTitle('Pratinjau templat IP berbagi');
		previewDialog.setScriptName('Tambahkan templat IP berbagi');
		previewDialog.setModality(true);

		const previewdiv = document.createElement('div');
		previewdiv.style.marginLeft = previewdiv.style.marginRight = '0.5em';
		previewdiv.style.fontSize = 'small';
		previewDialog.setContent(previewdiv);

		const previewer = new Morebits.wiki.Preview(previewdiv);
		previewer.beginRender(Twinkle.shared.getTemplateWikitext(input), mw.config.get('wgPageName'));

		const submit = document.createElement('input');
		submit.setAttribute('type', 'kirim');
		submit.setAttribute('value', 'Tutup');
		previewDialog.addContent(submit);

		previewDialog.display();

		$(submit).on('click', () => {
			previewDialog.close();
		});
	}
};

Twinkle.shared.getTemplateWikitext = function(input) {
	let text = '{{' + input.template + '|' + input.organization;
	if (input.contact) {
		text += '|' + input.contact;
	}
	if (input.host) {
		text += '|host=' + input.host;
	}
	text += '}}\n\n';
	return text;
};

Twinkle.shared.callback.evaluate = function twinklesharedCallbackEvaluate(e) {
	const params = Morebits.QuickForm.getInputData(e.target);
	if (!params.template) {
		alert('Anda harus memilih sebuah alaman IP berbagi untuk menggunakan!');
		return;
	}
	if (!params.organization) {
		alert('Anda harus memasukan sebuah organisasi untuk templat {{' + params.template + '}}');
		return;
	}

	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(e.target);

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = 'Memberi tag selesai, memuat ulang halaman pembicaraan';

	const wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'Perubahan halaman pembicaraan pengguna');
	wikipedia_page.setFollowRedirect(true);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.shared.callbacks.main);
};

Twinkle.addInitCallback(Twinkle.shared, 'shared');
}());

// </nowiki>
