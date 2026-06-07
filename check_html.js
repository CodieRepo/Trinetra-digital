fetch('https://trinetradigitalsolution.com/admin')
  .then(r => r.text())
  .then(html => {
    const matches = html.match(/src="\/assets\/[^"]*"/g);
    console.log(matches);
  });
