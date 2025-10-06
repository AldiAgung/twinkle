// <nowiki>

(function() {

/*
 ****************************************
 *** twinkleimage.js: Image CSD module
 ****************************************
 * Mode of invocation:     Tab ("DI")
 * Active on:              Local nonredirect file pages (not on Commons) - Only file pages that exist locally; Files that exist on Commons do not trigger this module.
 */

Twinkle.image = function twinkleimage() {
	if (mw.config.get('wgNamespaceNumber') === 6 && mw.config.get('wgArticleId') && !document.getElementById('mw-sharedupload') && !Morebits.isPageRedirect()) {
		Twinkle.addPortletLink(Twinkle.image.callback, 'DI', 'tw-di', 'Menominasikan berkas untuk penundaan penghapusan cepat');
	}
};

Twinkle.image.callback = function twinkleimageCallback() {
	const Window = new Morebits.SimpleWindow(600, 330);
	Window.setTitle('File for dated speedy deletion');
	Window.setScriptName('Twinkle');
	Window.addFooterLink('Kebijakan pengahpusan cepat', 'WP:KPC#Berkas');
	Window.addFooterLink('Preferesni berkas', 'WP:TW/PREF#image');
	Window.addFooterLink('Bantuan Twinkel', 'WP:TW/DOC#gambar');
	Window.addFooterLink('Give feedback', 'WT:TW');

	const form = new Morebits.QuickForm(Twinkle.image.callback.evaluate);
	form.append({
		type: 'checkbox',
		list: [
			{
				label: 'Beritahu pengunggah asli',
				value: 'notify',
				name: 'notify',
				tooltip: "Batalkan pilihan ini jika anda ingin membuat beberapa nominasi dari pengguna yang sama, dan tidak ingin memenuhi halamn pembicaraannya dengan terlalu banyak notifikasi.",
				checked: Twinkle.getPref('notifyUserOnDeli')
			}
		]
	}
	);
	const field = form.append({
		type: 'field',
		label: 'Jenis tindakan yang diinginkan'
	});
	field.append({
		type: 'radio',
		name: 'type',
		event: Twinkle.image.callback.choice,
		list: [
			{
				label: 'Tanpa sumber (KPC B4)',
				value: 'no source',
				checked: true,
				tooltip: 'Gambar atau media tidak memiliki informasi'
			},
			{
				label: 'Tanpa lisensi (KPC B4)',
				value: 'no license',
				tooltip: 'Gambar atau media tidak memilki informasi di status hak ciptanya'
			},
			{
				label: 'Tanpa sumber dan lisensi (KPC B4)',
				value: 'no source no license',
				tooltip: 'Gambar atau media tidak memilki informasi serta status hak ciptanya'
			},
			{
				label: 'Berkas nonbebas yang tak digunakan (KPC B5)',
				value: 'orphaned non-free use',
				tooltip: 'Gambar atau media tidak dilisensikan untuk penggunaan pada Wikipedia dan hanya diizinkan dibawah klaim penggunaan wajar per Wikipedia:Konten tak bebas, tetapi tidak digunakan di artikel manapun'
			},
			{
				label: 'Tidak memiliki alasan penggunaan nonbebas (KPC B6)',
				value: 'no non-free use rationale',
				tooltip: 'Gambar atau media diklaim untuk digunakan dibawah kebijakan penggunaan bebas Wiki, tetapi Tanpa penjelasan mengapa berkas tersebut diizinkan dibawah kebijakan tersebut.'
			},
			{
				label: 'Berkas penggunaan wajar yang dipertentangkan (KPC B7)',
				value: 'disputed non-free use rationale',
				tooltip: 'Gambar atau media yang diklaim perlu digunakan sejalan dengan kebijakan berkas non-bebas, tetapi tidak memiliki alasan mengapa hal ini dapat diizinkan untuk berkas ini'
			},
			{
				label: 'Berkas penggunaan wajar yang dapat digantikan (KPC B7)',
				value: 'replaceable non-free use',
				tooltip: 'Gambar atau media mungkin tidak memnuhi kriteria konten non bebas ([[WP:NFCC#1]]) karena menggambarkan suatu subjek yang mana gambar bebasnya dapat ditemukan atau dibuat yang secara memadai memberikan informasi yang sama'
			},
			{
				label: 'Tanpa bukti untuk perizinan (KPC B11)',
				value: 'no permission',
				tooltip: 'Gambar atau media tidak mempunyai bukti bahwa pengunggah setuju untuk melisensikan berkasnya'
			}
		]
	});
	form.append({
		type: 'div',
		label: 'Lingkup kerja',
		name: 'work_area'
	});
	form.append({ type: 'submit' });

	const result = form.render();
	Window.setContent(result);
	Window.display();

	// We must init the parameters
	const evt = document.createEvent('Event');
	evt.initEvent('change', true, true);
	result.type[0].dispatchEvent(evt);
};

Twinkle.image.callback.choice = function twinkleimageCallbackChoose(event) {
	const value = event.target.values;
	const root = event.target.form;
	const work_area = new Morebits.QuickForm.Element({
		type: 'div',
		name: 'work_area'
	});

	switch (value) {
		case 'no source no license':
		case 'no source':
			work_area.append({
				type: 'checkbox',
				list: [
					{
						label: 'Tidak bebas',
						name: 'non_free',
						tooltip: 'Berkas dilisensikan dibawah klaim pneggunaan wajar'
					}
				]
			});
		/* falls through */
		case 'no license':
			work_area.append({
				type: 'checkbox',
				list: [
					{
						name: 'derivative',
						label: 'Karya pengganti yang kekurnagan sumber untuk karya yang tergabung',
						tooltip: 'Berkas merupakan turunan dari satu atau lebih karya lain yang sumbernya tidak disebutkan'
					}
				]
			});
			break;
		case 'no permission':
			work_area.append({
				type: 'input',
				name: 'source',
				label: 'Sumber:'
			});
			break;
		case 'disputed non-free use rationale':
			work_area.append({
				type: 'textarea',
				name: 'reason',
				label: 'Tujuan:'
			});
			break;
		case 'orphaned non-free use':
			work_area.append({
				type: 'input',
				name: 'replacement',
				label: 'Penggantian:',
				tooltip: 'Berkas opsional yang mengganti berkas lama. Prefix "Berkas:" opsional.'
			});
			break;
		case 'replaceable non-free use':
			work_area.append({
				type: 'textarea',
				name: 'reason',
				label: 'Alasan:'
			});
			break;
		default:
			break;
	}

	root.replaceChild(work_area.render(), $(root).find('div[name="work_area"]')[0]);
};

Twinkle.image.callback.evaluate = function twinkleimageCallbackEvaluate(event) {

	const input = Morebits.QuickForm.getInputData(event.target);
	if (input.replacement) {
		input.replacement = (new RegExp('^' + Morebits.namespaceRegex(6) + ':', 'i').test(input.replacement) ? '' : 'Berkas:') + input.replacement;
	}

	let csdcrit;
	switch (input.type) {
		case 'no source no license':
		case 'no source':
		case 'no license':
			csdcrit = 'F4';
			break;
		case 'orphaned non-free use':
			csdcrit = 'F5';
			break;
		case 'no non-free use rationale':
			csdcrit = 'F6';
			break;
		case 'disputed non-free use rationale':
		case 'replaceable non-free use':
			csdcrit = 'F7';
			break;
		case 'no permission':
			csdcrit = 'F11';
			break;
		default:
			throw new Error('Twinkle.image.callback.evaluate: unknown criterion');
	}

	const lognomination = Twinkle.getPref('logSpeedyNominations') && !Twinkle.getPref('noLogOnSpeedyNomination').includes(csdcrit.toLowerCase());
	const templatename = input.derivative ? 'dw ' + input.type : input.type;

	const params = $.extend({
		templatename: templatename,
		normalized: csdcrit,
		lognomination: lognomination
	}, input);

	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(event.target);

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = 'Memberi tag selesai';

	// Tagging image
	const wikipedia_page = new Morebits.wiki.Page(mw.config.get('wgPageName'), 'Memberi tag pada berkas dengan tag penghapusan');
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.image.callbacks.taggingImage);

	// Notifying uploader
	if (input.notify) {
		wikipedia_page.lookupCreation(Twinkle.image.callbacks.userNotification);
	} else {
		// add to CSD log if desired
		if (lognomination) {
			Twinkle.image.callbacks.addToLog(params, null);
		}
		// No auto-notification, display what was going to be added.
		const noteData = document.createElement('pre');
		noteData.appendChild(document.createTextNode('{{subst:di-' + templatename + '-notice|1=' + mw.config.get('wgTitle') + '}} ~~~~'));
		Morebits.Status.info('Notifikasi', [ 'Data yang mengikuti/mirip harus diunggah ke penggunggah asli:', document.createElement('br'), noteData ]);
	}
};

Twinkle.image.callbacks = {
	taggingImage: function(pageobj) {
		let text = pageobj.getPageText();
		const params = pageobj.getCallbackParameters();

		// remove "move to Commons" tag - deletion-tagged files cannot be moved to Commons
		text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, '');

		let tag = '{{di-' + params.templatename + '|date={{subst:#time:j F Y}}';
		switch (params.type) {
			case 'no source no license':
			case 'no source':
				tag += params.non_free ? '|non-free=yes' : '';
				break;
			case 'no permission':
				tag += params.source ? '|source=' + params.source : '';
				break;
			case 'disputed non-free use rationale':
				tag += params.reason ? '|concern=' + params.reason : '';
				break;
			case 'orphaned non-free use':
				tag += params.replacement ? '|replacement=' + params.replacement : '';
				break;
			case 'replaceable non-free use':
				tag += params.reason ? '|1=' + params.reason : '';
				break;
			default:
				break; // doesn't matter
		}
		tag += '|help=off}}\n';

		pageobj.setPageText(tag + text);
		pageobj.setEditSummary('Berkas ini layak untuk dihapus per [[WP:KPC#' + params.normalized + '|KPC ' + params.normalized + ']] (' + params.type + ').');
		pageobj.setChangeTags(Twinkle.changeTags);
		pageobj.setWatchlist(Twinkle.getPref('deliWatchPage'));
		pageobj.setCreateOption('nocreate');
		pageobj.save();
	},
	userNotification: function(pageobj) {
		const params = pageobj.getCallbackParameters();
		const initialContrib = pageobj.getCreator();

		// disallow warning yourself
		if (initialContrib === mw.config.get('wgUserName')) {
			pageobj.getStatusElement().warn('Anda (' + initialContrib + ') membuat halaman ini; melewati notifikasi pengguna');
		} else {
			const usertalkpage = new Morebits.wiki.Page('User talk:' + initialContrib, 'Memberitahu kontributor awal (' + initialContrib + ')');
			let notifytext = '\n{{subst:di-' + params.templatename + '-notice|1=' + mw.config.get('wgTitle');
			if (params.type === 'no permission') {
				notifytext += params.source ? '|source=' + params.source : '';
			}
			notifytext += '}} ~~~~';
			usertalkpage.setAppendText(notifytext);
			usertalkpage.setEditSummary('Notifikasi: memberi tag untuk penghapusan [[:' + Morebits.pageNameNorm + ']].');
			usertalkpage.setChangeTags(Twinkle.changeTags);
			usertalkpage.setCreateOption('recreate');
			usertalkpage.setWatchlist(Twinkle.getPref('deliWatchUser'));
			usertalkpage.setFollowRedirect(true, false);
			usertalkpage.append();
		}

		// add this nomination to the user's userspace log, if the user has enabled it
		if (params.lognomination) {
			Twinkle.image.callbacks.addToLog(params, initialContrib);
		}
	},
	addToLog: function(params, initialContrib) {
		const usl = new Morebits.UserspaceLogger(Twinkle.getPref('speedyLogPageName'));
		usl.initialText =
			"Ini adalah semua catatan untuk nominasi [[WP:KPC|penghapusan cepat]] yang dibuat oleh pengguna ini dengan modul KPC [[WP:TW|Twinkle]].\n\n" +
			'Jika Anda tidak ingin lagi menyimpan catatan ini, Anda dapat menonaktifkannya menggunakan [[Wikipedia:Twinkle/Preferences|panel preferensi]], dan ' +
			'nominasi halaman ini untuk penghapusan cepat dibawah [[WP:KPC#U1|KPC U1]].' +
			(Morebits.userIsSysop ? '\n\nCatatan ini tidak melacak penghapusan cepat yang dilakukan menggunakan Twinkle.' : '');

		const formatParamLog = function(normalize, csdparam, input) {
			if (normalize === 'F5' && csdparam === 'replacement') {
				input = '[[:' + input + ']]';
			}
			return ' {' + normalize + ' ' + csdparam + ': ' + input + '}';
		};

		let extraInfo = '';

		// If a logged file is deleted but exists on commons, the wikilink will be blue, so provide a link to the log
		const fileLogLink = ' ([{{fullurl:Special:Log|page=' + mw.util.wikiUrlencode(mw.config.get('wgPageName')) + '}} log])';

		let appendText = '# [[:' + Morebits.pageNameNorm + ']]' + fileLogLink + ': DI [[WP:KPC#' + params.normalized.toUpperCase() + '|KPC ' + params.normalized.toUpperCase() + ']] ({{tl|di-' + params.templatename + '}})';

		['reason', 'replacement', 'source'].forEach((item) => {
			if (params[item]) {
				extraInfo += formatParamLog(params.normalized.toUpperCase(), item, params[item]);
				return false;
			}
		});

		if (extraInfo) {
			appendText += '; informasi tambahan:' + extraInfo;
		}
		if (initialContrib) {
			appendText += '; {{user|1=' + initialContrib + '}} diberitahu';
		}
		appendText += ' ~~~~~\n';

		const editsummary = 'Mencatat penghapusan cepat nominasi [[:' + Morebits.pageNameNorm + ']].';

		usl.changeTags = Twinkle.changeTags;
		usl.log(appendText, editsummary);
	}
};

Twinkle.addInitCallback(Twinkle.image, 'image');
}());

// </nowiki>
