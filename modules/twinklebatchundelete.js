// <nowiki>

(function() {

/*
 ****************************************
 *** twinklebatchundelete.js: Batch undelete module
 ****************************************
 * Mode of invocation:     Tab ("Und-batch")
 * Active on:              Existing user and project pages
 */

Twinkle.batchundelete = function twinklebatchundelete() {
	if (!Morebits.userIsSysop || !mw.config.get('wgArticleId') || (
		mw.config.get('wgNamespaceNumber') !== mw.config.get('wgNamespaceIds').user &&
		mw.config.get('wgNamespaceNumber') !== mw.config.get('wgNamespaceIds').project)) {
		return;
	}
	Twinkle.addPortletLink(Twinkle.batchundelete.callback, 'Und-batch', 'tw-batch-undel', "Undelete 'em all");
};

Twinkle.batchundelete.callback = function twinklebatchundeleteCallback() {
	const Window = new Morebits.SimpleWindow(600, 400);
	Window.setScriptName('Twinkle');
	Window.setTitle('Batch undelete');
	Window.addFooterLink('Bantuan Twinkle', 'WP:TW/DOC#batchundelete');
	Window.addFooterLink('Berikan umpan balik', 'WT:TW');

	const form = new Morebits.QuickForm(Twinkle.batchundelete.callback.evaluate);
	form.append({
		type: 'checkbox',
		list: [
			{
				label: 'Pulihkan halaman pembicaraan dari halaman terpulihkan jika ada',
				name: 'undel_talk',
				value: 'undel_talk',
				checked: true
			}
		]
	});
	form.append({
		type: 'input',
		name: 'reason',
		label: 'Alasan:',
		size: 60
	});

	const statusdiv = document.createElement('div');
	statusdiv.style.padding = '15px'; // just so it doesn't look broken
	Window.setContent(statusdiv);
	Morebits.Status.init(statusdiv);
	Window.display();

	const query = {
		action: 'query',
		generator: 'links',
		prop: 'info',
		inprop: 'protection',
		titles: mw.config.get('wgPageName'),
		gpllimit: Twinkle.getPref('batchMax'),
		format: 'json'
	};
	const statelem = new Morebits.Status('Mengambil daftar halaman');
	const wikipedia_api = new Morebits.wiki.Api('memuat...', query, ((apiobj) => {
		const response = apiobj.getResponse();
		let pages = (response.query && response.query.pages) || [];
		pages = pages.filter((page) => page.missing);
		const list = [];
		pages.sort(Twinkle.sortByNamespace);
		pages.forEach((page) => {
			const editProt = page.protection.filter((pr) => pr.type === 'create' && pr.level === 'sysop').pop();

			const title = page.title;
			list.push({
				label: title + (editProt ? ' (Terproteksi pembuatan penuh' +
					(editProt.expiry === 'tidak terbatas' ? ' tidak terdefinisikan' : ', kadaluwarsa ' + new Morebits.Date(editProt.expiry).calendar('utc') + ' (UTC)') + ')' : ''),
				value: title,
				checked: true,
				style: editProt ? 'color:red' : ''
			});
		});
		apiobj.params.form.append({ type: 'header', label: 'Halaman untuk dipulihkan' });
		apiobj.params.form.append({
			type: 'button',
			label: 'Pilih semua',
			event: function(e) {
				$(Morebits.QuickForm.getElements(e.target.form, 'pages')).prop('checked', true);
			}
		});
		apiobj.params.form.append({
			type: 'button',
			label: 'Batalkan pilihan',
			event: function(e) {
				$(Morebits.QuickForm.getElements(e.target.form, 'pages')).prop('checked', false);
			}
		});
		apiobj.params.form.append({
			type: 'checkbox',
			name: 'pages',
			shiftClickSupport: true,
			list: list
		});
		apiobj.params.form.append({ type: 'submit' });

		const result = apiobj.params.form.render();
		apiobj.params.Window.setContent(result);

		Morebits.QuickForm.getElements(result, 'pages').forEach(Twinkle.generateArrowLinks);

	}), statelem);
	wikipedia_api.params = { form: form, Window: Window };
	wikipedia_api.post();
};

Twinkle.batchundelete.callback.evaluate = function(event) {
	Morebits.wiki.actionCompleted.notice = 'Pemulihan selesai';

	const numProtected = Morebits.QuickForm.getElements(event.target, 'pages').filter((element) => element.checked && element.nextElementSibling.style.color === 'red').length;
	if (numProtected > 0 && !confirm('Anda ingin memulihkan halaman ' + numProtected + ' terproteksi penuh. Apakah anda yakin?')) {
		return;
	}

	const input = Morebits.QuickForm.getInputData(event.target);

	if (!input.reason) {
		alert('Anda perlu memberikan alasannya!');
		return;
	}
	Morebits.SimpleWindow.setButtonsEnabled(false);
	Morebits.Status.init(event.target);

	if (!input.pages || !input.pages.length) {
		Morebits.Status.error('Galat', 'tidak ada untuk dikembalikan, membatalkan');
		return;
	}

	const pageUndeleter = new Morebits.BatchOperation('Memulihkan halaman');
	pageUndeleter.setOption('chunkSize', Twinkle.getPref('batchChunks'));
	pageUndeleter.setOption('preserveIndividualStatusLines', true);
	pageUndeleter.setPageList(input.pages);
	pageUndeleter.run((pageName) => {
		const params = {
			page: pageName,
			undel_talk: input.undel_talk,
			reason: input.reason,
			pageUndeleter: pageUndeleter
		};

		const wikipedia_page = new Morebits.wiki.Page(pageName, 'memulihkan halaman ' + pageName);
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.setEditSummary(input.reason);
		wikipedia_page.setChangeTags(Twinkle.changeTags);
		wikipedia_page.suppressProtectWarning();
		wikipedia_page.setMaxRetries(3); // temporary increase from 2 to make batchundelete more likely to succeed [[phab:T222402]] #613
		wikipedia_page.undeletePage(Twinkle.batchundelete.callbacks.doExtras, pageUndeleter.workerFailure);
	});
};

Twinkle.batchundelete.callbacks = {
	// this stupid parameter name is a temporary thing until I implement an overhaul
	// of Morebits.wiki.* callback parameters
	doExtras: function(thingWithParameters) {
		const params = thingWithParameters.parent ? thingWithParameters.parent.getCallbackParameters() :
			thingWithParameters.getCallbackParameters();
		// the initial batch operation's job is to delete the page, and that has
		// succeeded by now
		params.pageUndeleter.workerSuccess(thingWithParameters);

		let query, wikipedia_api;

		if (params.undel_talk) {
			const talkpagename = new mw.Title(params.page).getTalkPage().getPrefixedText();
			if (talkpagename !== params.page) {
				query = {
					action: 'query',
					prop: 'deletedrevisions',
					drvprop: 'ids',
					drvlimit: 1,
					titles: talkpagename,
					format: 'json'
				};
				wikipedia_api = new Morebits.wiki.Api('Memeriksa halaman pembicaraan untuk revisi terhapus', query, Twinkle.batchundelete.callbacks.undeleteTalk);
				wikipedia_api.params = params;
				wikipedia_api.params.talkPage = talkpagename;
				wikipedia_api.post();
			}
		}
	},
	undeleteTalk: function(apiobj) {
		const page = apiobj.getResponse().query.pages[0];
		const exists = !page.missing;
		const delrevs = page.deletedrevisions && page.deletedrevisions[0].revid;

		if (exists || !delrevs) {
			// page exists or has no deleted revisions; forget about it
			return;
		}

		const talkpage = new Morebits.wiki.Page(apiobj.params.talkPage, 'Membatalkan penghapusan dari ' + apiobj.params.page);
		talkpage.setEditSummary('Membatalkan penghapusan [[Bantuan:halaman pembicaraan|halaman pembicaraan]] dari "' + apiobj.params.page + '"');
		talkpage.setChangeTags(Twinkle.changeTags);
		talkpage.undeletePage();
	}
};

Twinkle.addInitCallback(Twinkle.batchundelete, 'batchundelete');
}());

// </nowiki>
