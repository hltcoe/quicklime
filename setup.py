from setuptools import setup


if __name__ == '__main__':
    setup(
        name="quicklime",
        version="0.1.0",
        description="",

        packages=[
            'quicklime',
        ],
        include_package_data=True,

        scripts=['scripts/qlook.py'],
        setup_requires=[],
        tests_require=[],
        install_requires=[
            'concrete>=4.12.4',
            'humanfriendly',
        ],

        url="https://github.com/hltcoe/quicklime",
        license="BSD",
        maintainer="Craig Harman",
        maintainer_email="craig@craigharman.net",
    )
